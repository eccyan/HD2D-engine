import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';

interface Props {
  onClose: () => void;
}

export function ExportDialog({ onClose }: Props) {
  const characters = useSeuratStore((s) => s.characters);
  const exportCharacters = useSeuratStore((s) => s.exportCharacters);
  const exportProgress = useSeuratStore((s) => s.exportProgress);
  const exportError = useSeuratStore((s) => s.exportError);

  const [format, setFormat] = useState<'spritesheet' | 'individual'>('spritesheet');
  const [selected, setSelected] = useState<Set<string>>(new Set(characters));
  const [outputDir, setOutputDir] = useState('export');
  const [exporting, setExporting] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === characters.length) setSelected(new Set());
    else setSelected(new Set(characters));
  };

  const handleExport = async () => {
    setExporting(true);
    await exportCharacters({
      characterIds: Array.from(selected),
      format,
      outputDir: outputDir || undefined,
    });
    setExporting(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Export Characters</span>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>Format</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={format === 'spritesheet'}
                onChange={() => setFormat('spritesheet')}
              />
              <span>Spritesheet (single PNG per character)</span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={format === 'individual'}
                onChange={() => setFormat('individual')}
              />
              <span>Individual Frames (organized PNGs)</span>
            </label>
          </div>

          <label style={styles.label}>Characters</label>
          <div style={styles.charList}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={selected.size === characters.length}
                onChange={toggleAll}
              />
              <span style={{ fontWeight: 600 }}>Select All</span>
            </label>
            {characters.map((id) => (
              <label key={id} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => toggle(id)}
                />
                <span>{id}</span>
              </label>
            ))}
          </div>

          <label style={styles.label}>Output Directory (relative to project)</label>
          <input
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            placeholder="export"
            style={styles.input}
          />

          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            style={styles.primaryBtn}
          >
            {exporting ? 'Exporting...' : `Export ${selected.size} Character(s)`}
          </button>

          {exportProgress && (
            <div style={styles.progress}>{exportProgress}</div>
          )}
          {exportError && (
            <div style={styles.error}>{exportError}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#1a1a2a',
    border: '1px solid #3a3a5a',
    borderRadius: 8,
    width: 420,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a3a',
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#ddd',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  input: {
    background: '#111120',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  radioLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ccc',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  charList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 160,
    overflowY: 'auto',
    background: '#111120',
    border: '1px solid #2a2a3a',
    borderRadius: 4,
    padding: 8,
  },
  checkLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ccc',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 16px',
    cursor: 'pointer',
    marginTop: 8,
  },
  progress: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#8c8',
    background: '#1a2a1a',
    border: '1px solid #2a4a2a',
    borderRadius: 4,
    padding: '6px 10px',
    marginTop: 4,
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#f88',
    background: '#2a1a1a',
    border: '1px solid #5a2a2a',
    borderRadius: 4,
    padding: '6px 10px',
    marginTop: 4,
  },
};
