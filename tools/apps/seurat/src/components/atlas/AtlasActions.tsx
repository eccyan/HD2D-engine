import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';

export function AtlasActions() {
  const manifest = useSeuratStore((s) => s.manifest);
  const assemblyResult = useSeuratStore((s) => s.assemblyResult);
  const assembleAtlas = useSeuratStore((s) => s.assembleAtlas);
  const loadSpriteSheet = useSeuratStore((s) => s.loadSpriteSheet);
  const [assembling, setAssembling] = useState(false);

  if (!manifest) return null;

  const handleAssemble = async (validateOnly: boolean) => {
    setAssembling(true);
    await assembleAtlas(validateOnly);
    setAssembling(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.divider} />
      <div style={styles.sectionTitle}>Atlas Assembly</div>

      <div style={styles.section}>
        <div style={styles.subTitle}>Config</div>
        <ConfigRow label="Frame Size" value={`${manifest.spritesheet.frame_width}x${manifest.spritesheet.frame_height}`} />
        <ConfigRow label="Columns" value={String(manifest.spritesheet.columns)} />
        <ConfigRow label="Animations" value={String(manifest.animations.length)} />
        <ConfigRow label="Frames" value={String(manifest.animations.reduce((s, a) => s + a.frames.length, 0))} />
      </div>

      <div style={styles.actions}>
        <button onClick={() => handleAssemble(true)} disabled={assembling} style={styles.validateBtn}>
          {assembling ? '...' : 'Validate'}
        </button>
        <button onClick={() => handleAssemble(false)} disabled={assembling} style={styles.assembleBtn}>
          {assembling ? '...' : 'Assemble'}
        </button>
        <button onClick={loadSpriteSheet} style={styles.reloadBtn}>Reload</button>
      </div>

      {assemblyResult && (
        <div style={styles.section}>
          <div style={styles.subTitle}>Result</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#44aa44' }}>
            {assemblyResult.generatedFrames} / {assemblyResult.totalFrames} frames generated
          </div>
          {assemblyResult.errors.length > 0 && (
            <div>
              {assemblyResult.errors.map((err, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 9, color: '#d88', padding: '1px 0' }}>{err}</div>
              ))}
            </div>
          )}
          {assemblyResult.errors.length === 0 && (
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#70d870' }}>Success!</div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '1px 0' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#666', minWidth: 70 }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#bbb' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  divider: {
    height: 1,
    background: '#2a2a3a',
    margin: '4px 0',
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
  },
  section: {
    background: '#131324',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  subTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#777',
    fontWeight: 600,
    marginBottom: 2,
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
  validateBtn: {
    background: '#2a2a3a',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  assembleBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '5px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  reloadBtn: {
    background: '#222236',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '5px 8px',
    cursor: 'pointer',
  },
};
