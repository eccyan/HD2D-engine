import React, { useRef, useCallback, useState } from 'react';
import { useComposerStore } from './store/useComposerStore.js';
import { TrackTimeline } from './components/TrackTimeline.js';
import { MusicStateEditor } from './components/MusicStateEditor.js';
import { AIGeneratePanel } from './components/AIGeneratePanel.js';
import { AudioPlayer, AudioPlayerHandle } from './components/AudioPlayer.js';
import { useSaRemoteGeneration } from './hooks/useSaRemoteGeneration.js';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export function App() {
  const playerRef = useRef<AudioPlayerHandle | null>(null);

  const isPlaying = useComposerStore((s) => s.isPlaying);
  const bpm = useComposerStore((s) => s.bpm);
  const masterVolume = useComposerStore((s) => s.masterVolume);
  const loopEnabled = useComposerStore((s) => s.loopEnabled);
  const engineUrl = useComposerStore((s) => s.engineUrl);
  const engineConnected = useComposerStore((s) => s.engineConnected);
  const aiPanelOpen = useComposerStore((s) => s.aiPanelOpen);
  const playheadSec = useComposerStore((s) => s.playheadSec);
  const loopRegion = useComposerStore((s) => s.loopRegion);

  const {
    setPlaying,
    setBpm,
    setMasterVolume,
    setLoopEnabled,
    setEngineUrl,
    setEngineConnected,
    setAiPanelOpen,
    setPlayheadSec,
  } = useComposerStore();

  const [rightTab, setRightTab] = useState<'states' | 'ai'>('states');

  // Remote Stable Audio generation via test harness WebSocket
  useSaRemoteGeneration(playerRef);

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------
  const handlePlayStop = useCallback(() => {
    if (isPlaying) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [isPlaying, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setPlayheadSec(0);
    playerRef.current?.stop();
  }, [setPlaying, setPlayheadSec]);

  // -------------------------------------------------------------------------
  // Engine connection
  // -------------------------------------------------------------------------
  const handleConnect = useCallback(async () => {
    if (engineConnected) {
      setEngineConnected(false);
      return;
    }
    try {
      const res = await fetch(`${engineUrl}/state`);
      if (res.ok) {
        setEngineConnected(true);
      } else {
        setEngineConnected(false);
        alert(`Engine returned HTTP ${res.status}`);
      }
    } catch {
      setEngineConnected(false);
      alert(`Cannot reach engine at ${engineUrl}`);
    }
  }, [engineUrl, engineConnected, setEngineConnected]);

  // -------------------------------------------------------------------------
  // Export mix
  // -------------------------------------------------------------------------
  const handleExportMix = useCallback(async () => {
    const buf = await playerRef.current?.exportMix();
    if (!buf) { alert('No audio loaded to export.'); return; }
    const blob = new Blob([buf], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'music_mix.wav';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={styles.root}>
      {/* Invisible AudioPlayer (manages Web Audio API) */}
      <AudioPlayer ref={playerRef} />

      {/* ===== Toolbar ===== */}
      <div style={styles.toolbar}>
        {/* Brand */}
        <div style={styles.brand}>
          <span style={{ fontSize: 14 }}>♪</span>
          <span>Audio Composer</span>
        </div>

        <div style={styles.toolbarSeparator} />

        {/* Transport controls */}
        <div style={styles.transportGroup}>
          <TransportButton
            label={isPlaying ? '■' : '▶'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            active={isPlaying}
            onClick={handlePlayStop}
          />
          <TransportButton
            label="⏹"
            title="Stop"
            onClick={handleStop}
          />
          <TransportButton
            label="↺"
            title={loopEnabled ? 'Loop ON' : 'Loop OFF'}
            active={loopEnabled}
            onClick={() => setLoopEnabled(!loopEnabled)}
          />
        </div>

        {/* Playhead time */}
        <div style={styles.timeDisplay}>
          {formatTime(playheadSec)}
        </div>

        <div style={styles.toolbarSeparator} />

        {/* BPM */}
        <div style={styles.paramGroup}>
          <span style={styles.paramLabel}>BPM</span>
          <input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
            style={styles.bpmInput}
          />
        </div>

        {/* Master volume */}
        <div style={styles.paramGroup}>
          <span style={styles.paramLabel}>VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            style={styles.masterSlider}
          />
          <span style={styles.paramValue}>{(masterVolume * 100).toFixed(0)}</span>
        </div>

        <div style={styles.toolbarSeparator} />

        {/* Engine connection */}
        <div style={styles.paramGroup}>
          <input
            type="text"
            value={engineUrl}
            onChange={(e) => setEngineUrl(e.target.value)}
            style={styles.engineInput}
            placeholder="http://localhost:8080"
          />
          <button
            onClick={handleConnect}
            style={{
              ...styles.engineBtn,
              background: engineConnected ? '#1a3a1a' : '#1a1a1a',
              borderColor: engineConnected ? '#3a7a3a' : '#333',
              color: engineConnected ? '#70e870' : '#666',
            }}
          >
            {engineConnected ? 'Connected' : 'Connect'}
          </button>
        </div>

        <div style={styles.toolbarSeparator} />

        {/* Export mix */}
        <button onClick={handleExportMix} style={styles.exportBtn}>
          Export Mix
        </button>

        {/* AI Panel toggle */}
        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          style={{
            ...styles.aiToggleBtn,
            background: aiPanelOpen ? '#2a1a3a' : 'transparent',
            borderColor: aiPanelOpen ? '#6a3aa0' : '#333',
            color: aiPanelOpen ? '#c080f0' : '#666',
          }}
        >
          ♪ AI
        </button>
      </div>

      {/* ===== Main body ===== */}
      <div style={styles.body}>
        {/* Center: 4-lane timeline */}
        <div style={styles.timelineArea}>
          <TrackTimeline playerRef={playerRef} />
        </div>

        {/* Right: State editor + AI panel */}
        <div style={styles.rightPanel}>
          {/* Tab bar */}
          <div style={styles.tabBar}>
            <TabButton
              label="Music States"
              active={rightTab === 'states'}
              onClick={() => setRightTab('states')}
            />
            <TabButton
              label="AI Generate"
              active={rightTab === 'ai'}
              onClick={() => setRightTab('ai')}
            />
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {rightTab === 'states' && (
              <MusicStateEditor playerRef={playerRef} />
            )}
            {rightTab === 'ai' && (
              <AIGeneratePanel playerRef={playerRef} />
            )}
          </div>
        </div>
      </div>

      {/* ===== Status bar ===== */}
      <div style={styles.statusBar}>
        <span>Loop: {formatTime(loopRegion.startSec)} – {formatTime(loopRegion.endSec)}</span>
        <span style={styles.statusSep}>|</span>
        <span>44100 Hz · 16-bit PCM</span>
        <span style={styles.statusSep}>|</span>
        <span>{bpm} BPM</span>
        {engineConnected && (
          <>
            <span style={styles.statusSep}>|</span>
            <span style={{ color: '#70e870' }}>Engine connected</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
interface TransportButtonProps {
  label: string;
  title?: string;
  active?: boolean;
  onClick: () => void;
}

function TransportButton({ label, title, active, onClick }: TransportButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 26,
        background: active ? '#2a3a5a' : '#1a1a1a',
        border: `1px solid ${active ? '#4a6ab8' : '#333'}`,
        borderRadius: 3,
        color: active ? '#90b8f8' : '#888',
        fontFamily: 'monospace',
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 0',
        background: active ? '#1e1e1e' : '#141414',
        border: 'none',
        borderBottom: active ? '2px solid #5080c0' : '2px solid transparent',
        color: active ? '#b0c8f0' : '#555',
        fontFamily: 'monospace',
        fontSize: 10,
        cursor: 'pointer',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 100).toString().padStart(2, '0');
  return `${m}:${s}.${ms}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#111',
    color: '#ddd',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 10px',
    height: 42,
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    color: '#90a0c0',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  toolbarSeparator: {
    width: 1,
    height: 24,
    background: '#2a2a2a',
    flexShrink: 0,
  },
  transportGroup: {
    display: 'flex',
    gap: 4,
  },
  timeDisplay: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#80c0e0',
    letterSpacing: '0.04em',
    minWidth: 70,
    textAlign: 'right',
  },
  paramGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  paramLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  paramValue: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#777',
    minWidth: 24,
    textAlign: 'right',
  },
  bpmInput: {
    width: 48,
    background: '#111',
    border: '1px solid #333',
    borderRadius: 3,
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '2px 4px',
    outline: 'none',
    textAlign: 'center',
  },
  masterSlider: {
    width: 80,
    height: 3,
    cursor: 'pointer',
  },
  engineInput: {
    width: 160,
    background: '#111',
    border: '1px solid #333',
    borderRadius: 3,
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 6px',
    outline: 'none',
  },
  engineBtn: {
    padding: '3px 8px',
    border: '1px solid #333',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 9,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  exportBtn: {
    padding: '4px 10px',
    background: '#1a2a1a',
    border: '1px solid #2a5a2a',
    borderRadius: 3,
    color: '#70c870',
    fontFamily: 'monospace',
    fontSize: 10,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  aiToggleBtn: {
    padding: '4px 10px',
    border: '1px solid #333',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 10,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.1s',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  timelineArea: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    width: 300,
    minWidth: 300,
    borderLeft: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#141414',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #222',
    flexShrink: 0,
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 12px',
    height: 22,
    background: '#151515',
    borderTop: '1px solid #222',
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    flexShrink: 0,
  },
  statusSep: {
    margin: '0 10px',
    color: '#2a2a2a',
  },
};
