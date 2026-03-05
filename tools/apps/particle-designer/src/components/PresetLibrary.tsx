import React, { useState } from 'react';
import type { EmitterConfig } from '../store/useParticleStore.js';
import { useParticleStore } from '../store/useParticleStore.js';

// ---------------------------------------------------------------------------
// Built-in presets
// ---------------------------------------------------------------------------
export interface Preset {
  name: string;
  description: string;
  config: EmitterConfig;
}

export const PRESETS: Preset[] = [
  {
    name: 'torch_ember',
    description: 'Warm orange SoftGlow embers rising upward',
    config: {
      spawn_rate: 18,
      min_lifetime: 0.8,
      max_lifetime: 1.4,
      min_velocity: [-0.25, -1.5],
      max_velocity: [0.25, -2.5],
      acceleration: [0.05, 0.1],
      start_size: 0.16,
      end_size: 0.04,
      start_color: [1.0, 0.65, 0.1, 1.0],
      end_color: [0.9, 0.1, 0.0, 0.0],
      atlas_tile: 1, // SoftGlow
      z: 0.0,
      spawn_offset_min: [-0.15, -0.15],
      spawn_offset_max: [0.15, 0.15],
    },
  },
  {
    name: 'dust_puff',
    description: 'Brown-gray smoke puffs with gravity',
    config: {
      spawn_rate: 8,
      min_lifetime: 0.6,
      max_lifetime: 1.2,
      min_velocity: [-0.5, -0.8],
      max_velocity: [0.5, -0.2],
      acceleration: [0.0, 0.5],
      start_size: 0.22,
      end_size: 0.38,
      start_color: [0.55, 0.42, 0.32, 0.7],
      end_color: [0.4, 0.35, 0.28, 0.0],
      atlas_tile: 3, // SmokePuff
      z: 0.0,
      spawn_offset_min: [-0.2, 0.0],
      spawn_offset_max: [0.2, 0.1],
    },
  },
  {
    name: 'magic_aura',
    description: 'Colored spark aura in circular pattern',
    config: {
      spawn_rate: 30,
      min_lifetime: 0.4,
      max_lifetime: 0.9,
      min_velocity: [-1.2, -1.2],
      max_velocity: [1.2, 1.2],
      acceleration: [0.0, 0.0],
      start_size: 0.12,
      end_size: 0.02,
      start_color: [0.4, 0.6, 1.0, 1.0],
      end_color: [0.8, 0.3, 1.0, 0.0],
      atlas_tile: 2, // Spark
      z: 0.0,
      spawn_offset_min: [-0.3, -0.3],
      spawn_offset_max: [0.3, 0.3],
    },
  },
  {
    name: 'rain',
    description: 'Raindrops falling downward',
    config: {
      spawn_rate: 80,
      min_lifetime: 0.4,
      max_lifetime: 0.7,
      min_velocity: [-0.1, 4.0],
      max_velocity: [0.1, 6.0],
      acceleration: [0.0, 0.5],
      start_size: 0.08,
      end_size: 0.05,
      start_color: [0.5, 0.7, 1.0, 0.8],
      end_color: [0.4, 0.6, 0.9, 0.0],
      atlas_tile: 4, // Raindrop
      z: 0.0,
      spawn_offset_min: [-4.0, -4.0],
      spawn_offset_max: [4.0, 0.0],
    },
  },
  {
    name: 'snow',
    description: 'Snowflakes gently floating down',
    config: {
      spawn_rate: 25,
      min_lifetime: 2.0,
      max_lifetime: 4.0,
      min_velocity: [-0.3, 0.3],
      max_velocity: [0.3, 0.8],
      acceleration: [0.05, 0.05],
      start_size: 0.10,
      end_size: 0.08,
      start_color: [0.9, 0.95, 1.0, 0.9],
      end_color: [0.8, 0.9, 1.0, 0.0],
      atlas_tile: 5, // Snowflake
      z: 0.0,
      spawn_offset_min: [-5.0, -5.0],
      spawn_offset_max: [5.0, 0.0],
    },
  },
  {
    name: 'campfire',
    description: 'Mix of SoftGlow flames and rising sparks',
    config: {
      spawn_rate: 35,
      min_lifetime: 0.5,
      max_lifetime: 1.2,
      min_velocity: [-0.4, -2.0],
      max_velocity: [0.4, -3.5],
      acceleration: [0.0, 0.15],
      start_size: 0.25,
      end_size: 0.05,
      start_color: [1.0, 0.5, 0.05, 1.0],
      end_color: [0.7, 0.05, 0.0, 0.0],
      atlas_tile: 1, // SoftGlow
      z: 0.0,
      spawn_offset_min: [-0.25, -0.1],
      spawn_offset_max: [0.25, 0.1],
    },
  },
  {
    name: 'firefly',
    description: 'Dim circle particles with slow random drift',
    config: {
      spawn_rate: 4,
      min_lifetime: 2.5,
      max_lifetime: 4.0,
      min_velocity: [-0.2, -0.15],
      max_velocity: [0.2, 0.15],
      acceleration: [0.0, 0.0],
      start_size: 0.08,
      end_size: 0.06,
      start_color: [0.7, 1.0, 0.4, 0.5],
      end_color: [0.5, 0.9, 0.2, 0.0],
      atlas_tile: 0, // Circle
      z: 0.0,
      spawn_offset_min: [-2.0, -2.0],
      spawn_offset_max: [2.0, 2.0],
    },
  },
  {
    name: 'explosion',
    description: 'Fast burst of circles with short lifetime',
    config: {
      spawn_rate: 200,
      min_lifetime: 0.2,
      max_lifetime: 0.6,
      min_velocity: [-5.0, -5.0],
      max_velocity: [5.0, 5.0],
      acceleration: [0.0, 0.8],
      start_size: 0.3,
      end_size: 0.05,
      start_color: [1.0, 0.8, 0.2, 1.0],
      end_color: [0.6, 0.1, 0.0, 0.0],
      atlas_tile: 0, // Circle
      z: 0.0,
      spawn_offset_min: [-0.1, -0.1],
      spawn_offset_max: [0.1, 0.1],
    },
  },
];

// ---------------------------------------------------------------------------
// PresetLibrary component
// ---------------------------------------------------------------------------
interface PresetLibraryProps {
  onClose?: () => void;
}

export function PresetLibrary({ onClose }: PresetLibraryProps) {
  const applyPreset = useParticleStore((s) => s.applyPreset);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [lastClickIdx, setLastClickIdx] = useState<number | null>(null);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (idx: number) => {
    if (lastClickIdx === idx) {
      // Double-click: apply and close
      applyPreset(PRESETS[idx].config, PRESETS[idx].name);
      onClose?.();
      setLastClickIdx(null);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    } else {
      setLastClickIdx(idx);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        setLastClickIdx(null);
      }, 350);
    }
  };

  const handleApply = (idx: number) => {
    applyPreset(PRESETS[idx].config, PRESETS[idx].name);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={{ fontWeight: 700, color: '#c0a0ff' }}>Preset Library</span>
        <span style={{ color: '#555', fontSize: 10 }}>Click = select, Dbl-click = apply+close</span>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn}>x</button>
        )}
      </div>

      <div style={styles.list}>
        {PRESETS.map((preset, idx) => (
          <div
            key={preset.name}
            style={{
              ...styles.presetRow,
              background: hoveredIdx === idx ? '#1e1a2e' : lastClickIdx === idx ? '#1a1a30' : 'transparent',
              borderColor: lastClickIdx === idx ? '#6040a0' : '#2a2a3a',
            }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => handleClick(idx)}
          >
            {/* Color swatch — blend of start/end colors */}
            <div style={styles.swatchWrapper}>
              <div style={{
                ...styles.swatch,
                background: rgbaToCss(preset.config.start_color),
              }} />
              <div style={{
                ...styles.swatchSmall,
                background: rgbaToCss(preset.config.end_color),
              }} />
            </div>

            <div style={styles.presetInfo}>
              <div style={styles.presetName}>{preset.name}</div>
              <div style={styles.presetDesc}>{preset.description}</div>
              <div style={styles.presetMeta}>
                tile={TILE_NAMES[preset.config.atlas_tile] ?? preset.config.atlas_tile}
                {' · '}rate={preset.config.spawn_rate}/s
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleApply(idx); }}
              style={styles.applyBtn}
            >
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TILE_NAMES = ['Circle', 'SoftGlow', 'Spark', 'SmokePuff', 'Raindrop', 'Snowflake'];

function rgbaToCss([r, g, b, a]: [number, number, number, number]): string {
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a.toFixed(2)})`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    background: '#141420',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: '#1a1826',
    borderBottom: '1px solid #2a2a3a',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '0 4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    maxHeight: 320,
  },
  presetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #2a2a3a',
    transition: 'background 0.1s',
    userSelect: 'none',
  },
  swatchWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  swatch: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 3,
    border: '1px solid #333',
  },
  swatchSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 2,
    border: '1px solid #333',
  },
  presetInfo: {
    flex: 1,
    minWidth: 0,
  },
  presetName: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 600,
    color: '#c0a0ff',
    marginBottom: 2,
  },
  presetDesc: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  presetMeta: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
  },
  applyBtn: {
    background: '#2a1a4a',
    border: '1px solid #5a3a8a',
    borderRadius: 3,
    color: '#a070e0',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 8px',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
