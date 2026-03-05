import React, { useState, useCallback, useEffect } from 'react';
import { OscillatorPanel } from './components/OscillatorPanel.js';
import { EnvelopeEditor } from './components/EnvelopeEditor.js';
import { WaveformPreview } from './components/WaveformPreview.js';
import { FilterChain } from './components/FilterChain.js';
import { EffectsPanel } from './components/EffectsPanel.js';
import { AIGeneratePanel } from './components/AIGeneratePanel.js';
import { useSfxStore } from './store/useSfxStore.js';
import { renderSfx, encodeWav } from './audio/synth.js';

// ---------------------------------------------------------------------------
// Engine connection status indicator
// ---------------------------------------------------------------------------

function EngineStatus() {
  const connected = useSfxStore((s) => s.engineConnected);
  const url = useSfxStore((s) => s.engineUrl);
  const setUrl = useSfxStore((s) => s.setEngineUrl);
  const setConnected = useSfxStore((s) => s.setEngineConnected);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const handleConnect = useCallback(() => {
    setConnected(!connected);
  }, [connected, setConnected]);

  return (
    <div style={toolbarStyles.engineStatus}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#50e050' : '#505050',
          boxShadow: connected ? '0 0 6px #50e050' : 'none',
          flexShrink: 0,
        }}
      />
      {editing ? (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { setEditing(false); setUrl(draft); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setEditing(false); setUrl(draft); }
              if (e.key === 'Escape') { setEditing(false); setDraft(url); }
            }}
            autoFocus
            style={{
              background: '#1a1a2a',
              border: '1px solid #4a4a8a',
              borderRadius: 3,
              color: '#a0a0e0',
              fontFamily: 'monospace',
              fontSize: 10,
              padding: '1px 6px',
              outline: 'none',
              width: 160,
            }}
          />
        </>
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ fontFamily: 'monospace', fontSize: 10, color: '#505070', cursor: 'text' }}
          title="Click to edit engine URL"
        >
          {url}
        </span>
      )}
      <button
        onClick={handleConnect}
        style={{
          background: connected ? '#1a2a1a' : '#1a1a2a',
          border: connected ? '1px solid #3a7a3a' : '1px solid #3a3a6a',
          borderRadius: 3,
          color: connected ? '#60c060' : '#6060b0',
          fontFamily: 'monospace',
          fontSize: 9,
          padding: '1px 7px',
          cursor: 'pointer',
        }}
      >
        {connected ? 'DISC' : 'CONN'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface ToolbarProps {
  onRender: () => void;
  onExport: () => void;
  isRendering: boolean;
  rightPanel: 'filter' | 'ai';
  onSetRightPanel: (p: 'filter' | 'ai') => void;
}

function Toolbar({ onRender, onExport, isRendering, rightPanel, onSetRightPanel }: ToolbarProps) {
  return (
    <div style={toolbarStyles.toolbar}>
      {/* App title */}
      <div style={toolbarStyles.title}>
        <span style={{ color: '#9080d0', fontWeight: 800 }}>SFX</span>
        <span style={{ color: '#505070', fontWeight: 400 }}> Designer</span>
      </div>

      {/* Center actions */}
      <div style={toolbarStyles.actions}>
        <button
          onClick={onRender}
          disabled={isRendering}
          style={{
            ...toolbarStyles.btn,
            background: '#1a2a3a',
            border: '1px solid #3a6aaa',
            color: '#60b0e0',
            opacity: isRendering ? 0.6 : 1,
          }}
          title="Render SFX from current parameters"
        >
          {isRendering ? 'Rendering…' : 'RENDER'}
        </button>

        <button
          onClick={onExport}
          style={{
            ...toolbarStyles.btn,
            background: '#2a2a1a',
            border: '1px solid #7a6a2a',
            color: '#c0a040',
          }}
          title="Export as WAV file"
        >
          EXPORT WAV
        </button>
      </div>

      {/* Right panel tabs */}
      <div style={toolbarStyles.tabs}>
        {(['filter', 'ai'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onSetRightPanel(tab)}
            style={{
              ...toolbarStyles.tab,
              background: rightPanel === tab ? '#2a2a4a' : 'transparent',
              border: rightPanel === tab ? '1px solid #4a4a8a' : '1px solid transparent',
              color: rightPanel === tab ? '#9090d0' : '#505070',
            }}
          >
            {tab === 'filter' ? 'FILTERS + FX' : 'AI GENERATE'}
          </button>
        ))}
      </div>

      {/* Engine connection */}
      <EngineStatus />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const store = useSfxStore();
  const [isRendering, setIsRendering] = useState(false);
  const [rightPanel, setRightPanel] = useState<'filter' | 'ai'>('filter');

  // Auto-render on mount with default settings
  useEffect(() => {
    const samples = renderSfx({
      oscillators: store.oscillators,
      envelope: store.envelope,
      filters: store.filters,
      reverb: store.reverb,
      delay: store.delay,
      distortion: store.distortion,
    });
    store.setGeneratedSamples(samples);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRender = useCallback(async () => {
    setIsRendering(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 0));
      const samples = renderSfx({
        oscillators: store.oscillators,
        envelope: store.envelope,
        filters: store.filters,
        reverb: store.reverb,
        delay: store.delay,
        distortion: store.distortion,
      });
      store.setGeneratedSamples(samples);
    } finally {
      setIsRendering(false);
    }
  }, [store]);

  const handleExport = useCallback(() => {
    const samples = store.generatedSamples;
    if (!samples) {
      // Render first, then export
      const newSamples = renderSfx({
        oscillators: store.oscillators,
        envelope: store.envelope,
        filters: store.filters,
        reverb: store.reverb,
        delay: store.delay,
        distortion: store.distortion,
      });
      store.setGeneratedSamples(newSamples);
      const wav = encodeWav(newSamples);
      downloadWav(wav);
    } else {
      const wav = encodeWav(samples);
      downloadWav(wav);
    }
  }, [store]);

  return (
    <div style={styles.app}>
      <Toolbar
        onRender={handleRender}
        onExport={handleExport}
        isRendering={isRendering}
        rightPanel={rightPanel}
        onSetRightPanel={setRightPanel}
      />

      <div style={styles.body}>
        {/* Left column: oscillators */}
        <div style={styles.leftPanel}>
          <OscillatorPanel />
        </div>

        {/* Center column: waveform + envelope */}
        <div style={styles.centerPanel}>
          <WaveformPreview />
          <div style={styles.envelopeWrap}>
            <EnvelopeEditor />
          </div>
        </div>

        {/* Right column: filters or AI */}
        <div style={styles.rightPanel}>
          {rightPanel === 'filter' ? (
            <>
              <FilterChain />
              <EffectsPanel />
            </>
          ) : (
            <AIGeneratePanel />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadWav(wav: ArrayBuffer) {
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sfx_export.wav';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const toolbarStyles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '6px 12px',
    background: '#16162a',
    borderBottom: '1px solid #2a2a4a',
    flexShrink: 0,
    height: 44,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: 6,
    flex: 1,
  },
  btn: {
    borderRadius: 4,
    padding: '5px 12px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  tab: {
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.06em',
  },
  engineStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#1a1a2e',
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid #2a2a3a',
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  envelopeWrap: {
    flexShrink: 0,
    borderTop: '1px solid #2a2a3a',
  },
  rightPanel: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderLeft: '1px solid #2a2a3a',
  },
};
