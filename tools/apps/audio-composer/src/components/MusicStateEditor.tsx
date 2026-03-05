import React, { useCallback } from 'react';
import { useComposerStore, LayerId, MusicStateId } from '../store/useComposerStore.js';
import { AudioPlayerHandle } from './AudioPlayer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MusicStateEditorProps {
  playerRef: React.RefObject<AudioPlayerHandle | null>;
}

const LAYER_IDS: LayerId[] = ['bass', 'harmony', 'melody', 'percussion'];
const LAYER_LABELS: Record<LayerId, string> = {
  bass: 'Bass',
  harmony: 'Harm',
  melody: 'Melody',
  percussion: 'Perc',
};
const LAYER_COLORS: Record<LayerId, string> = {
  bass: '#4a6aff',
  harmony: '#a040e0',
  melody: '#40b870',
  percussion: '#e07040',
};

// ---------------------------------------------------------------------------
// MusicStateEditor
// ---------------------------------------------------------------------------
export function MusicStateEditor({ playerRef }: MusicStateEditorProps) {
  const musicStates = useComposerStore((s) => s.musicStates);
  const activeMusicState = useComposerStore((s) => s.activeMusicState);
  const crossfadeRate = useComposerStore((s) => s.crossfadeRate);
  const { setMusicStateVolume, setActiveMusicState, setCrossfadeRate } = useComposerStore();

  // -------------------------------------------------------------------------
  // Preview a state (apply volumes via crossfade)
  // -------------------------------------------------------------------------
  const handlePreview = useCallback((stateId: MusicStateId) => {
    const ms = useComposerStore.getState().musicStates.find((s) => s.id === stateId);
    if (!ms) return;
    const rate = useComposerStore.getState().crossfadeRate;
    setActiveMusicState(stateId);
    playerRef.current?.crossfadeTo(ms.volumes, 1 / rate);
    // Also update store layer volumes
    for (const id of LAYER_IDS) {
      useComposerStore.getState().setLayerVolume(id, ms.volumes[id]);
    }
  }, [playerRef, setActiveMusicState]);

  // -------------------------------------------------------------------------
  // Export config JSON
  // -------------------------------------------------------------------------
  const handleExportJson = useCallback(() => {
    const { musicStates, crossfadeRate } = useComposerStore.getState();
    const config = {
      crossfade_rate: crossfadeRate,
      states: musicStates.reduce(
        (acc, ms) => {
          acc[ms.id] = { ...ms.volumes };
          return acc;
        },
        {} as Record<string, Record<LayerId, number>>,
      ),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'music_states.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={styles.root}>
      {/* Section header */}
      <div style={styles.sectionHeader}>
        Music State Presets
      </div>

      {/* Grid */}
      <div style={styles.gridWrapper}>
        {/* Column headers: layer names */}
        <div style={styles.gridRow}>
          <div style={{ ...styles.gridCell, ...styles.rowHeaderCell }} />
          {LAYER_IDS.map((lid) => (
            <div
              key={lid}
              style={{
                ...styles.gridCell,
                ...styles.colHeader,
                color: LAYER_COLORS[lid],
              }}
            >
              {LAYER_LABELS[lid]}
            </div>
          ))}
          <div style={{ ...styles.gridCell, width: 52 }} />
        </div>

        {/* State rows */}
        {musicStates.map((ms) => (
          <div
            key={ms.id}
            style={{
              ...styles.gridRow,
              background: activeMusicState === ms.id ? '#1e2a1e' : 'transparent',
              borderLeft: activeMusicState === ms.id ? '2px solid #40b870' : '2px solid transparent',
            }}
          >
            {/* State name */}
            <div style={{ ...styles.gridCell, ...styles.rowHeaderCell }}>
              {ms.label}
            </div>

            {/* Volume sliders */}
            {LAYER_IDS.map((lid) => (
              <div key={lid} style={{ ...styles.gridCell, ...styles.sliderCell }}>
                <VolumeCell
                  value={ms.volumes[lid]}
                  color={LAYER_COLORS[lid]}
                  onChange={(v) => setMusicStateVolume(ms.id, lid, v)}
                />
              </div>
            ))}

            {/* Preview button */}
            <div style={{ ...styles.gridCell, width: 52, paddingLeft: 4 }}>
              <button
                onClick={() => handlePreview(ms.id)}
                style={{
                  ...styles.previewBtn,
                  background: activeMusicState === ms.id ? '#2a4a2a' : '#1a1a1a',
                  borderColor: activeMusicState === ms.id ? '#40b870' : '#333',
                  color: activeMusicState === ms.id ? '#70e870' : '#666',
                }}
              >
                {activeMusicState === ms.id ? 'Active' : 'Apply'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Crossfade rate */}
      <div style={styles.crossfadeRow}>
        <span style={styles.crossfadeLabel}>Crossfade Rate</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={crossfadeRate}
          onChange={(e) => setCrossfadeRate(parseFloat(e.target.value))}
          style={styles.crossfadeSlider}
        />
        <span style={styles.crossfadeValue}>{crossfadeRate.toFixed(1)}</span>
      </div>

      {/* Export button */}
      <button
        onClick={handleExportJson}
        style={styles.exportBtn}
      >
        Export Config JSON
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VolumeCell — compact slider + numeric display
// ---------------------------------------------------------------------------
interface VolumeCellProps {
  value: number;
  color: string;
  onChange: (v: number) => void;
}

function VolumeCell({ value, color, onChange }: VolumeCellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
      {/* Mini bar */}
      <div style={{ width: '80%', height: 28, background: '#111', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value * 100}%`,
            background: color + '66',
            borderTop: `1px solid ${color}`,
            transition: 'height 0.1s',
          }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            WebkitAppearance: 'slider-vertical',
          }}
        />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#666' }}>
        {(value * 10).toFixed(0)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  root: {
    background: '#161616',
    borderTop: '1px solid #252525',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '6px 10px',
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #222',
    background: '#1a1a1a',
  },
  gridWrapper: {
    overflowX: 'auto',
  },
  gridRow: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #1e1e1e',
    minHeight: 52,
    paddingLeft: 4,
    paddingRight: 4,
  },
  gridCell: {
    flex: 1,
    minWidth: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 4px',
  },
  rowHeaderCell: {
    flex: 0,
    minWidth: 58,
    justifyContent: 'flex-start',
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#aaa',
    fontWeight: 600,
  },
  colHeader: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  sliderCell: {
    padding: '4px 2px',
  },
  previewBtn: {
    width: 46,
    height: 22,
    fontFamily: 'monospace',
    fontSize: 9,
    border: '1px solid #333',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'all 0.1s',
  },
  crossfadeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderTop: '1px solid #222',
  },
  crossfadeLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  },
  crossfadeSlider: {
    flex: 1,
    height: 3,
    cursor: 'pointer',
  },
  crossfadeValue: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#888',
    width: 28,
    textAlign: 'right' as const,
  },
  exportBtn: {
    margin: '6px 10px',
    padding: '5px 0',
    background: '#1a2a1a',
    border: '1px solid #2a4a2a',
    borderRadius: 4,
    color: '#70c070',
    fontFamily: 'monospace',
    fontSize: 10,
    cursor: 'pointer',
  },
};
