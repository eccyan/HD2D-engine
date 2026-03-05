import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParticleStore } from './store/useParticleStore.js';
import { useEngine } from './hooks/useEngine.js';
import { ParticlePreview } from './components/ParticlePreview.js';
import { EmitterPanel } from './components/EmitterPanel.js';
import { PresetLibrary } from './components/PresetLibrary.js';
import { AIAssistPanel } from './components/AIAssistPanel.js';

// ---------------------------------------------------------------------------
// Emitter list panel (left sidebar)
// ---------------------------------------------------------------------------
function EmitterListPanel() {
  const {
    emitters,
    selectedEmitterId,
    selectEmitter,
    addEmitter,
    removeEmitter,
    duplicateEmitter,
  } = useParticleStore();

  return (
    <div style={styles.emitterList}>
      {/* Header */}
      <div style={styles.sidebarHeader}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#c0a0ff' }}>
          Emitters
        </span>
        <button
          onClick={() => addEmitter()}
          title="Add emitter"
          style={styles.iconBtn}
        >
          +
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {emitters.map((emitter) => {
          const isSelected = emitter.id === selectedEmitterId;
          return (
            <div
              key={emitter.id}
              onClick={() => selectEmitter(emitter.id)}
              style={{
                ...styles.emitterRow,
                background: isSelected ? '#1e1a30' : 'transparent',
                borderLeft: isSelected ? '2px solid #8060c0' : '2px solid transparent',
              }}
            >
              {/* Color swatch from start_color */}
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: `rgba(${Math.round(emitter.config.start_color[0]*255)},${Math.round(emitter.config.start_color[1]*255)},${Math.round(emitter.config.start_color[2]*255)},${emitter.config.start_color[3]})`,
                flexShrink: 0,
                border: '1px solid #333',
              }} />

              <span style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: isSelected ? '#d0c0ff' : '#888',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {emitter.name}
              </span>

              {/* Action buttons, shown on hover via group approach */}
              <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateEmitter(emitter.id); }}
                  title="Duplicate"
                  style={styles.microBtn}
                >
                  D
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeEmitter(emitter.id); }}
                  title="Remove"
                  style={{ ...styles.microBtn, color: '#c06060' }}
                >
                  x
                </button>
              </div>
            </div>
          );
        })}

        {emitters.length === 0 && (
          <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 10, color: '#444', textAlign: 'center' }}>
            No emitters.<br />Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------
interface ToolbarProps {
  onShowPresets: () => void;
  onShowAI: () => void;
  onExport: () => void;
  onImport: () => void;
}

function Toolbar({ onShowPresets, onShowAI, onExport, onImport }: ToolbarProps) {
  const { engineConnected, engineUrl, setEngineUrl } = useParticleStore();
  const { connect, disconnect } = useEngine();
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(engineUrl);

  const handleConnectionToggle = useCallback(async () => {
    if (engineConnected) {
      disconnect();
    } else {
      await connect();
    }
  }, [engineConnected, connect, disconnect]);

  const handleUrlSubmit = () => {
    setEngineUrl(urlDraft);
    setEditingUrl(false);
  };

  return (
    <div style={styles.toolbar}>
      <span style={styles.appTitle}>Particle Designer</span>

      <div style={styles.toolbarSep} />

      {/* Preset library button */}
      <button onClick={onShowPresets} style={styles.toolbarBtn}>
        Presets
      </button>

      {/* AI assist button */}
      <button onClick={onShowAI} style={styles.toolbarBtn}>
        AI Assist
      </button>

      <div style={styles.toolbarSep} />

      {/* Export / Import */}
      <button onClick={onExport} style={styles.toolbarBtn}>
        Export JSON
      </button>
      <button onClick={onImport} style={styles.toolbarBtn}>
        Import JSON
      </button>

      <div style={{ flex: 1 }} />

      {/* Engine connection */}
      {editingUrl ? (
        <input
          type="text"
          value={urlDraft}
          autoFocus
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={handleUrlSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') setEditingUrl(false); }}
          style={{
            background: '#1a1a2a',
            border: '1px solid #5a3a8a',
            borderRadius: 4,
            color: '#c0b0e0',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '3px 8px',
            outline: 'none',
            width: 200,
          }}
        />
      ) : (
        <button
          onClick={() => setEditingUrl(true)}
          title="Click to edit engine URL"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#555',
            fontFamily: 'monospace',
            fontSize: 10,
            cursor: 'pointer',
            padding: '0 6px',
          }}
        >
          {engineUrl}
        </button>
      )}

      <button
        onClick={handleConnectionToggle}
        style={{
          ...styles.toolbarBtn,
          background: engineConnected ? '#1a2a1a' : '#1a1a1a',
          borderColor: engineConnected ? '#40804a' : '#3a2a5a',
          color: engineConnected ? '#70c070' : '#a080d0',
        }}
      >
        <span style={{
          display: 'inline-block',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: engineConnected ? '#70c070' : '#555',
          marginRight: 5,
          verticalAlign: 'middle',
        }} />
        {engineConnected ? 'Connected' : 'Connect'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export function App() {
  const { emitters, selectedEmitterId, autoSync, setAutoSync, exportJson, importJson } = useParticleStore();
  const { setEmitterConfig } = useEngine();
  const [showPresets, setShowPresets] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync: when selected emitter config changes, send to engine
  const selectedEmitter = emitters.find((e) => e.id === selectedEmitterId) ?? null;
  const autoSyncRef = useRef(autoSync);
  autoSyncRef.current = autoSync;
  const engineConnected = useParticleStore((s) => s.engineConnected);

  useEffect(() => {
    if (!autoSyncRef.current) return;
    if (!engineConnected) return;
    if (!selectedEmitter) return;
    const engineId = selectedEmitter.engine_id;
    if (engineId === undefined) return;
    setEmitterConfig(engineId, selectedEmitter.config);
  }, [selectedEmitter?.config, engineConnected]); // eslint-disable-line

  const handleExport = useCallback(() => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'particle-emitters.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJson]);

  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        importJson(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importJson],
  );

  const handleToggleAutoSync = useCallback(() => {
    setAutoSync(!autoSync);
  }, [autoSync, setAutoSync]);

  return (
    <div style={styles.root}>
      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      {/* Toolbar */}
      <Toolbar
        onShowPresets={() => setShowPresets((v) => !v)}
        onShowAI={() => setShowAI((v) => !v)}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Body: Left | Center | Right */}
      <div style={styles.body}>
        {/* Left: Emitter list */}
        <EmitterListPanel />

        {/* Center: Particle preview + optional panels */}
        <div style={styles.centerArea}>
          {/* Preset library panel (above preview when shown) */}
          {showPresets && (
            <div style={{ flexShrink: 0, borderBottom: '1px solid #1e1e30' }}>
              <PresetLibrary onClose={() => setShowPresets(false)} />
            </div>
          )}

          {/* Particle preview fills remaining space */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ParticlePreview config={selectedEmitter?.config ?? null} />
          </div>
        </div>

        {/* Right: Config panel */}
        <div style={styles.rightPanel}>
          {/* EmitterPanel: property editor */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={styles.panelHeader}>
              <span>Config</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <EmitterPanel
                autoSync={autoSync}
                onToggleAutoSync={handleToggleAutoSync}
              />
            </div>
          </div>

          {/* AI Assist panel (collapsible at bottom) */}
          {showAI && (
            <div style={{ flexShrink: 0, borderTop: '1px solid #1e1e30', overflow: 'auto', maxHeight: '50%' }}>
              <AIAssistPanel onClose={() => setShowAI(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
    background: '#0f0f1a',
    color: '#e0e0e0',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    height: 40,
    background: '#0c0c18',
    borderBottom: '1px solid #1e1e30',
    flexShrink: 0,
  },
  appTitle: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#c0a0ff',
    letterSpacing: '0.05em',
  },
  toolbarSep: {
    width: 1,
    height: 20,
    background: '#2a2a3a',
    margin: '0 4px',
  },
  toolbarBtn: {
    background: '#1a1a2a',
    border: '1px solid #3a2a5a',
    borderRadius: 4,
    color: '#a080d0',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  emitterList: {
    width: 200,
    display: 'flex',
    flexDirection: 'column',
    background: '#0c0c18',
    borderRight: '1px solid #1e1e30',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid #1e1e30',
    background: '#0f0f1e',
  },
  iconBtn: {
    background: '#2a1a4a',
    border: '1px solid #5a3a8a',
    borderRadius: 4,
    color: '#b080ff',
    fontFamily: 'monospace',
    fontSize: 16,
    lineHeight: 1,
    width: 22,
    height: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  emitterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    cursor: 'pointer',
    borderBottom: '1px solid #151522',
    transition: 'background 0.1s',
    userSelect: 'none',
  },
  microBtn: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 10,
    cursor: 'pointer',
    padding: '1px 3px',
    lineHeight: 1,
    borderRadius: 2,
  },
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  rightPanel: {
    width: 290,
    display: 'flex',
    flexDirection: 'column',
    background: '#0e0e1c',
    borderLeft: '1px solid #1e1e30',
    flexShrink: 0,
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '7px 12px',
    background: '#0f0f1e',
    borderBottom: '1px solid #1e1e30',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#7060a0',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
};
