import React, { useCallback } from 'react';
import { useSfxStore, type OscillatorDef, type WaveformType } from '../store/useSfxStore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WAVEFORMS: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];

/** Convert linear slider value [0..1] to logarithmic Hz in [minHz..maxHz]. */
function sliderToFreq(v: number, minHz = 20, maxHz = 20000): number {
  return minHz * Math.pow(maxHz / minHz, v);
}

/** Convert Hz to linear slider value [0..1]. */
function freqToSlider(hz: number, minHz = 20, maxHz = 20000): number {
  return Math.log(hz / minHz) / Math.log(maxHz / minHz);
}

function formatHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`;
  return `${Math.round(hz)} Hz`;
}

// ---------------------------------------------------------------------------
// Single oscillator row
// ---------------------------------------------------------------------------

interface OscRowProps {
  osc: OscillatorDef;
  canRemove: boolean;
}

function OscRow({ osc, canRemove }: OscRowProps) {
  const update = useSfxStore((s) => s.updateOscillator);
  const remove = useSfxStore((s) => s.removeOscillator);
  const addHarmonic = useSfxStore((s) => s.addHarmonic);

  const set = useCallback(
    (patch: Partial<OscillatorDef>) => update(osc.id, patch),
    [osc.id, update],
  );

  const [showSweep, setShowSweep] = React.useState(osc.freqEnvDuration > 0);

  return (
    <div style={styles.oscCard}>
      {/* Header row */}
      <div style={styles.oscHeader}>
        <span style={styles.oscLabel}>OSC</span>

        {/* Waveform buttons */}
        <div style={styles.waveRow}>
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => set({ waveform: w })}
              title={w}
              style={{
                ...styles.waveBtn,
                background: osc.waveform === w ? '#3a4a7a' : '#1e1e2e',
                border: osc.waveform === w ? '1px solid #6080c0' : '1px solid #333',
                color: osc.waveform === w ? '#a0c0ff' : '#666',
              }}
            >
              {WAVEFORM_ICONS[w]}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={() => addHarmonic(osc.id)}
          title="Add harmonic (2x freq)"
          style={styles.actionBtn}
        >
          +2x
        </button>
        {canRemove && (
          <button
            onClick={() => remove(osc.id)}
            title="Remove oscillator"
            style={{ ...styles.actionBtn, color: '#c06060', borderColor: '#5a2a2a' }}
          >
            x
          </button>
        )}
      </div>

      {/* Frequency */}
      <SliderRow
        label="Freq"
        value={freqToSlider(osc.frequency)}
        min={0} max={1} step={0.001}
        display={formatHz(osc.frequency)}
        onChange={(v) => {
          const hz = sliderToFreq(v);
          set({ frequency: hz });
          if (!showSweep) set({ freqEnvStart: hz, freqEnvEnd: hz });
        }}
      />

      {/* Detune */}
      <SliderRow
        label="Detune"
        value={osc.detune}
        min={-100} max={100} step={1}
        display={`${osc.detune > 0 ? '+' : ''}${osc.detune} ct`}
        onChange={(v) => set({ detune: v })}
      />

      {/* Volume */}
      <SliderRow
        label="Volume"
        value={osc.volume}
        min={0} max={1} step={0.01}
        display={`${Math.round(osc.volume * 100)}%`}
        onChange={(v) => set({ volume: v })}
      />

      {/* Freq sweep toggle */}
      <div style={styles.sweepToggle}>
        <button
          onClick={() => {
            const next = !showSweep;
            setShowSweep(next);
            if (!next) set({ freqEnvDuration: 0, freqEnvStart: osc.frequency, freqEnvEnd: osc.frequency });
          }}
          style={{
            ...styles.toggleBtn,
            background: showSweep ? '#2a3a1a' : '#1a1a1a',
            border: showSweep ? '1px solid #4a7a2a' : '1px solid #333',
            color: showSweep ? '#80c040' : '#555',
          }}
        >
          {showSweep ? 'Sweep ON' : 'Freq Sweep'}
        </button>
      </div>

      {showSweep && (
        <div style={styles.sweepPanel}>
          <SliderRow
            label="Start"
            value={freqToSlider(osc.freqEnvStart)}
            min={0} max={1} step={0.001}
            display={formatHz(osc.freqEnvStart)}
            onChange={(v) => set({ freqEnvStart: sliderToFreq(v) })}
          />
          <SliderRow
            label="End"
            value={freqToSlider(osc.freqEnvEnd)}
            min={0} max={1} step={0.001}
            display={formatHz(osc.freqEnvEnd)}
            onChange={(v) => set({ freqEnvEnd: sliderToFreq(v) })}
          />
          <SliderRow
            label="Dur"
            value={osc.freqEnvDuration}
            min={0} max={2} step={0.01}
            display={`${osc.freqEnvDuration.toFixed(2)}s`}
            onChange={(v) => set({ freqEnvDuration: v })}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable labeled slider
// ---------------------------------------------------------------------------

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <div style={styles.sliderRow}>
      <span style={styles.sliderLabel}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
      <span style={styles.sliderValue}>{display}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waveform icon shapes (tiny ASCII approximations)
// ---------------------------------------------------------------------------

const WAVEFORM_ICONS: Record<WaveformType, string> = {
  sine:     '~',
  square:   '\u229E',
  sawtooth: '\u2A58',
  triangle: '\u29C0',
  noise:    '\u2307',
};

// ---------------------------------------------------------------------------
// OscillatorPanel
// ---------------------------------------------------------------------------

export function OscillatorPanel() {
  const oscillators = useSfxStore((s) => s.oscillators);
  const addOscillator = useSfxStore((s) => s.addOscillator);

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>OSCILLATORS</span>
        <button onClick={addOscillator} style={styles.addBtn} title="Add oscillator">
          + ADD
        </button>
      </div>
      <div style={styles.oscList}>
        {oscillators.map((osc) => (
          <OscRow key={osc.id} osc={osc} canRemove={oscillators.length > 1} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#181825',
    borderRight: '1px solid #2a2a3a',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: '#1e1e2e',
    borderBottom: '1px solid #2a2a3a',
    flexShrink: 0,
  },
  panelTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#8080c0',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  addBtn: {
    background: '#2a3a5a',
    border: '1px solid #4a6ab0',
    borderRadius: 3,
    color: '#80a0e0',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  oscList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  oscCard: {
    background: '#1e1e2e',
    border: '1px solid #2a2a4a',
    borderRadius: 6,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  oscHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  oscLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#506090',
    fontWeight: 700,
    letterSpacing: '0.1em',
    minWidth: 24,
  },
  waveRow: {
    display: 'flex',
    gap: 3,
    flex: 1,
  },
  waveBtn: {
    borderRadius: 3,
    padding: '2px 6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 1,
    transition: 'all 0.1s',
  },
  actionBtn: {
    background: '#1a1a2a',
    border: '1px solid #333',
    borderRadius: 3,
    color: '#60a060',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 6px',
    cursor: 'pointer',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sliderLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#606080',
    minWidth: 34,
    textAlign: 'right' as const,
  },
  slider: {
    flex: 1,
    accentColor: '#6080c0',
    height: 3,
    cursor: 'pointer',
  },
  sliderValue: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#a0a0c0',
    minWidth: 56,
    textAlign: 'right' as const,
  },
  sweepToggle: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  toggleBtn: {
    borderRadius: 3,
    padding: '2px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  sweepPanel: {
    marginTop: 4,
    padding: '6px 8px',
    background: '#161620',
    borderRadius: 4,
    border: '1px solid #2a3a1a',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
};
