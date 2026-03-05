import React, { useCallback } from 'react';
import { useParticleStore } from '../store/useParticleStore.js';
import type { EmitterConfig } from '../store/useParticleStore.js';
import { useEngine } from '../hooks/useEngine.js';

// ---------------------------------------------------------------------------
// Tile name mapping (matches engine particle atlas, 6 tiles)
// ---------------------------------------------------------------------------
const TILE_OPTIONS = [
  { value: 0, label: 'Circle' },
  { value: 1, label: 'SoftGlow' },
  { value: 2, label: 'Spark' },
  { value: 3, label: 'SmokePuff' },
  { value: 4, label: 'Raindrop' },
  { value: 5, label: 'Snowflake' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LabelProps {
  children: React.ReactNode;
}
function SectionHeader({ children }: LabelProps) {
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 10,
      color: '#7060a0',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 700,
      padding: '10px 12px 4px',
      borderTop: '1px solid #222230',
      marginTop: 4,
    }}>
      {children}
    </div>
  );
}

interface NumberSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  onChange: (v: number) => void;
}
function NumberSlider({ label, value, min, max, step = 0.01, decimals = 2, onChange }: NumberSliderProps) {
  return (
    <div style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa' }}>{label}</span>
        <input
          type="number"
          value={value.toFixed(decimals)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: 64,
            background: '#1a1a2a',
            border: '1px solid #333',
            borderRadius: 3,
            color: '#c0b0e0',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '2px 5px',
            textAlign: 'right',
            outline: 'none',
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#8060c0', cursor: 'pointer' }}
      />
    </div>
  );
}

interface Vec2InputProps {
  label: string;
  value: [number, number];
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: [number, number]) => void;
}
function Vec2Input({ label, value, min = -10, max = 10, step = 0.05, onChange }: Vec2InputProps) {
  return (
    <div style={{ padding: '4px 12px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['X', 'Y'] as const).map((axis, i) => (
          <div key={axis} style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#666', marginBottom: 2 }}>{axis}</div>
            <input
              type="number"
              value={value[i].toFixed(3)}
              min={min}
              max={max}
              step={step}
              onChange={(e) => {
                const next: [number, number] = [value[0], value[1]];
                next[i] = parseFloat(e.target.value) || 0;
                onChange(next);
              }}
              style={{
                width: '100%',
                background: '#1a1a2a',
                border: '1px solid #333',
                borderRadius: 3,
                color: '#c0b0e0',
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '3px 5px',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: [number, number, number, number];
  onChange: (v: [number, number, number, number]) => void;
}
function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const hex = rgbaToHex(value);
  const alpha = value[3];

  return (
    <div style={{ padding: '4px 12px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            const rgb = hexToRgb(e.target.value);
            onChange([rgb[0], rgb[1], rgb[2], alpha]);
          }}
          style={{
            width: 40,
            height: 28,
            background: 'none',
            border: '1px solid #444',
            borderRadius: 3,
            cursor: 'pointer',
            padding: 1,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#666', marginBottom: 2 }}>Alpha</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={(e) => {
              onChange([value[0], value[1], value[2], parseFloat(e.target.value)]);
            }}
            style={{ width: '100%', accentColor: '#8060c0', cursor: 'pointer' }}
          />
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', width: 32 }}>
          {alpha.toFixed(2)}
        </span>
      </div>
      {/* Preview swatch */}
      <div style={{
        marginTop: 4,
        height: 8,
        borderRadius: 3,
        background: `rgba(${Math.round(value[0]*255)},${Math.round(value[1]*255)},${Math.round(value[2]*255)},${alpha})`,
        border: '1px solid #333',
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EmitterPanel
// ---------------------------------------------------------------------------
interface EmitterPanelProps {
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

export function EmitterPanel({ autoSync, onToggleAutoSync }: EmitterPanelProps) {
  const { emitters, selectedEmitterId, updateConfig, engineConnected } = useParticleStore();
  const { setEmitterConfig, listEmitters } = useEngine();

  const selected = emitters.find((e) => e.id === selectedEmitterId) ?? null;

  const update = useCallback(
    (patch: Partial<EmitterConfig>) => {
      if (!selected) return;
      updateConfig(selected.id, patch);
    },
    [selected, updateConfig],
  );

  const handleSendToEngine = useCallback(async () => {
    if (!selected) return;
    if (!engineConnected) {
      alert('Not connected to engine. Use the toolbar to connect first.');
      return;
    }

    // Fetch current engine emitter list
    const resp = await listEmitters();
    if (!resp) return;

    if (resp.emitters.length === 0) {
      alert('No emitters found in engine. Load a scene first.');
      return;
    }

    // Use first emitter or engine_id if mapped
    const engineId = selected.engine_id ?? resp.emitters[0].id;
    await setEmitterConfig(engineId, selected.config);
  }, [selected, engineConnected, listEmitters, setEmitterConfig]);

  if (!selected) {
    return (
      <div style={styles.empty}>
        <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 12 }}>
          No emitter selected.
        </span>
      </div>
    );
  }

  const cfg = selected.config;

  return (
    <div style={styles.container}>
      {/* Emitter name */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #222230' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', marginBottom: 3 }}>Name</div>
        <input
          type="text"
          value={selected.name}
          onChange={(e) => {
            useParticleStore.setState((s) => ({
              emitters: s.emitters.map((em) =>
                em.id === selected.id ? { ...em, name: e.target.value } : em,
              ),
            }));
          }}
          style={{
            width: '100%',
            background: '#1a1a2a',
            border: '1px solid #333',
            borderRadius: 4,
            color: '#ddd',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
      </div>

      {/* Spawn */}
      <SectionHeader>Spawn</SectionHeader>
      <NumberSlider
        label="Spawn Rate (particles/s)"
        value={cfg.spawn_rate}
        min={0}
        max={200}
        step={1}
        decimals={0}
        onChange={(v) => update({ spawn_rate: v })}
      />
      <NumberSlider
        label="Lifetime Min (s)"
        value={cfg.min_lifetime}
        min={0.05}
        max={10}
        step={0.05}
        onChange={(v) => update({ min_lifetime: v })}
      />
      <NumberSlider
        label="Lifetime Max (s)"
        value={cfg.max_lifetime}
        min={0.05}
        max={10}
        step={0.05}
        onChange={(v) => update({ max_lifetime: v })}
      />
      <Vec2Input
        label="Spawn Offset Min"
        value={cfg.spawn_offset_min}
        min={-8}
        max={8}
        onChange={(v) => update({ spawn_offset_min: v })}
      />
      <Vec2Input
        label="Spawn Offset Max"
        value={cfg.spawn_offset_max}
        min={-8}
        max={8}
        onChange={(v) => update({ spawn_offset_max: v })}
      />

      {/* Motion */}
      <SectionHeader>Motion</SectionHeader>
      <Vec2Input
        label="Velocity Min (X, Y)"
        value={cfg.min_velocity}
        min={-10}
        max={10}
        onChange={(v) => update({ min_velocity: v })}
      />
      <Vec2Input
        label="Velocity Max (X, Y)"
        value={cfg.max_velocity}
        min={-10}
        max={10}
        onChange={(v) => update({ max_velocity: v })}
      />
      <Vec2Input
        label="Acceleration (X, Y)"
        value={cfg.acceleration}
        min={-5}
        max={5}
        step={0.02}
        onChange={(v) => update({ acceleration: v })}
      />

      {/* Appearance */}
      <SectionHeader>Appearance</SectionHeader>
      <NumberSlider
        label="Size Start"
        value={cfg.start_size}
        min={0.01}
        max={1.0}
        step={0.01}
        onChange={(v) => update({ start_size: v })}
      />
      <NumberSlider
        label="Size End"
        value={cfg.end_size}
        min={0.0}
        max={1.0}
        step={0.01}
        onChange={(v) => update({ end_size: v })}
      />
      <ColorPicker
        label="Color Start"
        value={cfg.start_color}
        onChange={(v) => update({ start_color: v })}
      />
      <ColorPicker
        label="Color End"
        value={cfg.end_color}
        onChange={(v) => update({ end_color: v })}
      />

      {/* Atlas tile */}
      <div style={{ padding: '6px 12px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa', marginBottom: 4 }}>
          Particle Shape
        </div>
        <select
          value={cfg.atlas_tile}
          onChange={(e) => update({ atlas_tile: parseInt(e.target.value, 10) })}
          style={{
            width: '100%',
            background: '#1a1a2a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#c0b0e0',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '5px 8px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {TILE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Depth */}
      <SectionHeader>Depth</SectionHeader>
      <NumberSlider
        label="Z (depth bias)"
        value={cfg.z}
        min={-1}
        max={1}
        step={0.05}
        onChange={(v) => update({ z: v })}
      />

      {/* Engine sync */}
      <SectionHeader>Engine Sync</SectionHeader>
      <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Auto-sync toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={onToggleAutoSync}
            style={{ accentColor: '#8060c0', cursor: 'pointer' }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>
            Auto-sync changes to engine
          </span>
        </label>

        {/* Manual send button */}
        <button
          onClick={handleSendToEngine}
          style={{
            padding: '7px 0',
            background: engineConnected ? '#2a1a4a' : '#1e1e28',
            border: engineConnected ? '1px solid #7040c0' : '1px solid #333',
            borderRadius: 5,
            color: engineConnected ? '#b080ff' : '#555',
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 600,
            cursor: engineConnected ? 'pointer' : 'not-allowed',
          }}
        >
          {engineConnected ? 'Send to Engine' : 'Engine Not Connected'}
        </button>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------
function rgbaToHex([r, g, b]: [number, number, number, number]): string {
  const toHex = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    flex: 1,
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
