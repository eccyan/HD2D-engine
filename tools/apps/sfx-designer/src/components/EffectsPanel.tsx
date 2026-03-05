import React from 'react';
import { useSfxStore, type ReverbEffect, type DelayEffect, type DistortionEffect } from '../store/useSfxStore.js';

// ---------------------------------------------------------------------------
// Generic slider row for effects
// ---------------------------------------------------------------------------

interface EffectSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function EffectSlider({ label, value, min, max, step, display, onChange, disabled }: EffectSliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <span style={styles.label}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#70a0a8', cursor: disabled ? 'default' : 'pointer' }}
      />
      <span style={styles.value}>{display}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Effect section header
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  enabled: boolean;
  bypass: boolean;
  onToggleEnabled: () => void;
  onToggleBypass: () => void;
}

function SectionHeader({ title, enabled, bypass, onToggleEnabled, onToggleBypass }: SectionHeaderProps) {
  return (
    <div style={styles.sectionHeader}>
      <span style={styles.sectionTitle}>{title}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onToggleEnabled}
          title={enabled ? 'Disable effect' : 'Enable effect'}
          style={{
            ...styles.toggleBtn,
            background: enabled ? '#1a2a3a' : '#1a1a1a',
            border: enabled ? '1px solid #2a5a6a' : '1px solid #2a2a2a',
            color: enabled ? '#60c0c0' : '#404050',
          }}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onToggleBypass}
          title={bypass ? 'Remove bypass' : 'Bypass effect'}
          style={{
            ...styles.toggleBtn,
            background: bypass ? '#2a1a1a' : '#1a1a1a',
            border: bypass ? '1px solid #6a2a2a' : '1px solid #2a2a2a',
            color: bypass ? '#c06060' : '#404050',
          }}
        >
          {bypass ? 'BYP' : 'IN'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reverb section
// ---------------------------------------------------------------------------

function ReverbSection() {
  const reverb = useSfxStore((s) => s.reverb);
  const setReverb = useSfxStore((s) => s.setReverb);

  const active = reverb.enabled && !reverb.bypass;

  return (
    <div style={styles.effectCard}>
      <SectionHeader
        title="REVERB"
        enabled={reverb.enabled}
        bypass={reverb.bypass}
        onToggleEnabled={() => setReverb({ enabled: !reverb.enabled })}
        onToggleBypass={() => setReverb({ bypass: !reverb.bypass })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 6px 4px' }}>
        <EffectSlider
          label="Room"
          value={reverb.roomSize}
          min={0} max={1} step={0.01}
          display={`${Math.round(reverb.roomSize * 100)}%`}
          onChange={(v) => setReverb({ roomSize: v })}
          disabled={!active}
        />
        <EffectSlider
          label="Damp"
          value={reverb.dampening}
          min={0} max={1} step={0.01}
          display={`${Math.round(reverb.dampening * 100)}%`}
          onChange={(v) => setReverb({ dampening: v })}
          disabled={!active}
        />
        <EffectSlider
          label="Mix"
          value={reverb.mix}
          min={0} max={1} step={0.01}
          display={`${Math.round(reverb.mix * 100)}%`}
          onChange={(v) => setReverb({ mix: v })}
          disabled={!active}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delay section
// ---------------------------------------------------------------------------

function DelaySection() {
  const delay = useSfxStore((s) => s.delay);
  const setDelay = useSfxStore((s) => s.setDelay);

  const active = delay.enabled && !delay.bypass;

  return (
    <div style={styles.effectCard}>
      <SectionHeader
        title="DELAY"
        enabled={delay.enabled}
        bypass={delay.bypass}
        onToggleEnabled={() => setDelay({ enabled: !delay.enabled })}
        onToggleBypass={() => setDelay({ bypass: !delay.bypass })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 6px 4px' }}>
        <EffectSlider
          label="Time"
          value={delay.time}
          min={0.01} max={1} step={0.001}
          display={`${(delay.time * 1000).toFixed(0)} ms`}
          onChange={(v) => setDelay({ time: v })}
          disabled={!active}
        />
        <EffectSlider
          label="Feedback"
          value={delay.feedback}
          min={0} max={0.95} step={0.01}
          display={`${Math.round(delay.feedback * 100)}%`}
          onChange={(v) => setDelay({ feedback: v })}
          disabled={!active}
        />
        <EffectSlider
          label="Mix"
          value={delay.mix}
          min={0} max={1} step={0.01}
          display={`${Math.round(delay.mix * 100)}%`}
          onChange={(v) => setDelay({ mix: v })}
          disabled={!active}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distortion section
// ---------------------------------------------------------------------------

const OVERSAMPLE_OPTIONS: Array<DistortionEffect['oversample']> = ['none', '2x', '4x'];

function DistortionSection() {
  const distortion = useSfxStore((s) => s.distortion);
  const setDistortion = useSfxStore((s) => s.setDistortion);

  const active = distortion.enabled && !distortion.bypass;

  return (
    <div style={styles.effectCard}>
      <SectionHeader
        title="DISTORTION"
        enabled={distortion.enabled}
        bypass={distortion.bypass}
        onToggleEnabled={() => setDistortion({ enabled: !distortion.enabled })}
        onToggleBypass={() => setDistortion({ bypass: !distortion.bypass })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 6px 4px' }}>
        <EffectSlider
          label="Amount"
          value={distortion.amount}
          min={0} max={400} step={1}
          display={`${distortion.amount}`}
          onChange={(v) => setDistortion({ amount: v })}
          disabled={!active}
        />
        <EffectSlider
          label="Mix"
          value={distortion.mix}
          min={0} max={1} step={0.01}
          display={`${Math.round(distortion.mix * 100)}%`}
          onChange={(v) => setDistortion({ mix: v })}
          disabled={!active}
        />
        {/* Oversample selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: active ? 1 : 0.4 }}>
          <span style={styles.label}>OS</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {OVERSAMPLE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => active && setDistortion({ oversample: opt })}
                style={{
                  background: distortion.oversample === opt ? '#2a3a2a' : '#1a1a1a',
                  border: distortion.oversample === opt ? '1px solid #4a7a4a' : '1px solid #2a2a2a',
                  borderRadius: 3,
                  color: distortion.oversample === opt ? '#80c080' : '#404050',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  padding: '2px 7px',
                  cursor: active ? 'pointer' : 'default',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EffectsPanel
// ---------------------------------------------------------------------------

export function EffectsPanel() {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>EFFECTS</span>
      </div>
      <div style={styles.effectList}>
        <ReverbSection />
        <DelaySection />
        <DistortionSection />
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
    background: '#181825',
    flex: 1,
    overflow: 'hidden',
  },
  panelHeader: {
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
  effectList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  effectCard: {
    background: '#1e1e2e',
    border: '1px solid #2a2a4a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 8px',
    background: '#22223a',
    borderBottom: '1px solid #2a2a4a',
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    color: '#7080a0',
    letterSpacing: '0.08em',
  },
  toggleBtn: {
    borderRadius: 3,
    padding: '1px 6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#506070',
    minWidth: 46,
    textAlign: 'right' as const,
  },
  value: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#8090a8',
    minWidth: 48,
    textAlign: 'right' as const,
  },
};
