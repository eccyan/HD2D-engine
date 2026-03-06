import React, { useState, useCallback } from 'react';
import { usePainterStore } from '../store/usePainterStore.js';
import type { AssetManifest, TileSlotDef, SpriteRowDef } from '@vulkan-game-tools/asset-types';

// ---------------------------------------------------------------------------
// Dimension presets
// ---------------------------------------------------------------------------

const DIM_PRESETS = [
  { label: '16x16', w: 16, h: 16 },
  { label: '24x24', w: 24, h: 24 },
  { label: '32x32', w: 32, h: 32 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManifestSettings() {
  const { manifest, setManifest, setShowManifestSettings } = usePainterStore();
  const [draft, setDraft] = useState<AssetManifest>(JSON.parse(JSON.stringify(manifest)));
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const apply = useCallback(() => {
    setManifest(draft);
  }, [draft, setManifest]);

  const handleExportJson = useCallback(() => {
    const text = JSON.stringify(draft, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [draft]);

  const handleImportJson = useCallback(() => {
    if (jsonMode && jsonText.trim()) {
      try {
        const parsed = JSON.parse(jsonText) as AssetManifest;
        setDraft(parsed);
        setJsonMode(false);
      } catch (e) {
        alert('Invalid JSON');
      }
    } else {
      setJsonText(JSON.stringify(draft, null, 2));
      setJsonMode(true);
    }
  }, [jsonMode, jsonText, draft]);

  const updateTileDim = (key: 'tile_width' | 'tile_height' | 'columns' | 'rows', val: number) => {
    setDraft((d) => ({ ...d, tileset: { ...d.tileset, [key]: val } }));
  };

  const updateFrameDim = (key: 'frame_width' | 'frame_height' | 'columns', val: number) => {
    setDraft((d) => ({ ...d, spritesheet: { ...d.spritesheet, [key]: val } }));
  };

  const updateSlotLabel = (id: number, label: string) => {
    setDraft((d) => {
      const slots = d.tileset.slots.map((s) => s.id === id ? { ...s, label } : s);
      return { ...d, tileset: { ...d.tileset, slots } };
    });
  };

  const updateRowLabel = (row: number, label: string) => {
    setDraft((d) => {
      const rows = d.spritesheet.rows.map((r) => r.row === row ? { ...r, label } : r);
      return { ...d, spritesheet: { ...d.spritesheet, rows } };
    });
  };

  if (jsonMode) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.title}>Manifest JSON</span>
          <button onClick={() => setShowManifestSettings(false)} style={styles.closeBtn}>X</button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={20}
          style={styles.jsonArea}
        />
        <div style={styles.btnRow}>
          <button onClick={handleImportJson} style={styles.applyBtn}>Parse & Apply</button>
          <button onClick={() => setJsonMode(false)} style={styles.cancelBtn}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>Asset Manifest</span>
        <button onClick={() => setShowManifestSettings(false)} style={styles.closeBtn}>X</button>
      </div>

      <div style={styles.body}>
        {/* Tile dimensions */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Tile Dimensions</div>
          <div style={styles.dimRow}>
            <label style={styles.dimLabel}>W</label>
            <input type="number" min={1} value={draft.tileset.tile_width}
              onChange={(e) => updateTileDim('tile_width', parseInt(e.target.value) || 16)}
              style={styles.dimInput} />
            <label style={styles.dimLabel}>H</label>
            <input type="number" min={1} value={draft.tileset.tile_height}
              onChange={(e) => updateTileDim('tile_height', parseInt(e.target.value) || 16)}
              style={styles.dimInput} />
          </div>
          <div style={styles.dimRow}>
            <label style={styles.dimLabel}>Cols</label>
            <input type="number" min={1} value={draft.tileset.columns}
              onChange={(e) => updateTileDim('columns', parseInt(e.target.value) || 8)}
              style={styles.dimInput} />
            <label style={styles.dimLabel}>Rows</label>
            <input type="number" min={1} value={draft.tileset.rows}
              onChange={(e) => updateTileDim('rows', parseInt(e.target.value) || 3)}
              style={styles.dimInput} />
          </div>
          <div style={styles.presetRow}>
            {DIM_PRESETS.map((p) => (
              <button key={p.label} onClick={() => { updateTileDim('tile_width', p.w); updateTileDim('tile_height', p.h); }}
                style={{ ...styles.presetBtn, borderColor: draft.tileset.tile_width === p.w && draft.tileset.tile_height === p.h ? '#4a9ef8' : '#444' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tile slot labels */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Tile Slots</div>
          {draft.tileset.slots.map((slot) => (
            <div key={slot.id} style={styles.slotRow}>
              <span style={styles.slotId}>#{slot.id}</span>
              <input type="text" value={slot.label}
                onChange={(e) => updateSlotLabel(slot.id, e.target.value)}
                style={styles.slotInput} />
            </div>
          ))}
        </div>

        {/* Frame dimensions */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Frame Dimensions</div>
          <div style={styles.dimRow}>
            <label style={styles.dimLabel}>W</label>
            <input type="number" min={1} value={draft.spritesheet.frame_width}
              onChange={(e) => updateFrameDim('frame_width', parseInt(e.target.value) || 16)}
              style={styles.dimInput} />
            <label style={styles.dimLabel}>H</label>
            <input type="number" min={1} value={draft.spritesheet.frame_height}
              onChange={(e) => updateFrameDim('frame_height', parseInt(e.target.value) || 16)}
              style={styles.dimInput} />
          </div>
          <div style={styles.dimRow}>
            <label style={styles.dimLabel}>Cols</label>
            <input type="number" min={1} value={draft.spritesheet.columns}
              onChange={(e) => updateFrameDim('columns', parseInt(e.target.value) || 4)}
              style={styles.dimInput} />
          </div>
          <div style={styles.presetRow}>
            {DIM_PRESETS.map((p) => (
              <button key={p.label} onClick={() => { updateFrameDim('frame_width', p.w); updateFrameDim('frame_height', p.h); }}
                style={{ ...styles.presetBtn, borderColor: draft.spritesheet.frame_width === p.w && draft.spritesheet.frame_height === p.h ? '#4a9ef8' : '#444' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sprite row labels */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Sprite Rows</div>
          {draft.spritesheet.rows.map((rd) => (
            <div key={rd.row} style={styles.slotRow}>
              <span style={styles.slotId}>R{rd.row}</span>
              <input type="text" value={rd.label}
                onChange={(e) => updateRowLabel(rd.row, e.target.value)}
                style={styles.slotInput} />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.section}>
          <div style={styles.btnRow}>
            <button onClick={apply} style={styles.applyBtn}>Apply</button>
            <button onClick={handleExportJson} style={styles.exportBtn}>Export JSON</button>
            <button onClick={handleImportJson} style={styles.importBtn}>Import JSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    background: '#1e1e2e',
    borderTop: '1px solid #333',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: '#16162a',
    borderBottom: '1px solid #333',
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 6px',
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 2,
  },
  dimRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  dimLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#777',
    width: 28,
  },
  dimInput: {
    background: '#1a1a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 5px',
    width: 50,
    outline: 'none',
  },
  presetRow: {
    display: 'flex',
    gap: 4,
    marginTop: 2,
  },
  presetBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 6px',
    cursor: 'pointer',
  },
  slotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  slotId: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#666',
    width: 24,
    flexShrink: 0,
  },
  slotInput: {
    background: '#1a1a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 5px',
    flex: 1,
    outline: 'none',
  },
  btnRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  applyBtn: {
    background: '#1a3a1a',
    border: '1px solid #3a7a3a',
    borderRadius: 4,
    color: '#70d870',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  exportBtn: {
    background: '#2a3a5a',
    border: '1px solid #4a6ab8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  importBtn: {
    background: '#3a2a1a',
    border: '1px solid #7a4a1a',
    borderRadius: 4,
    color: '#e0a040',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  jsonArea: {
    flex: 1,
    background: '#1a1a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: 8,
    resize: 'vertical',
    outline: 'none',
    margin: '0 10px 10px 10px',
  },
};
