import React, { useRef, useEffect } from 'react';
import { useSfxStore, type FilterDef, type FilterType } from '../store/useSfxStore.js';

// ---------------------------------------------------------------------------
// Frequency response canvas
// ---------------------------------------------------------------------------

const CANVAS_W = 280;
const CANVAS_H = 80;

const FILTER_TYPES: FilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];

/** Compute biquad magnitude response at normalized freq w (0..pi). */
function biquadMagnitude(
  b0: number, b1: number, b2: number,
  a1: number, a2: number,
  w: number,
): number {
  const cos1 = Math.cos(w);
  const cos2 = Math.cos(2 * w);
  const sin1 = Math.sin(w);
  const sin2 = Math.sin(2 * w);

  const numR = b0 + b1 * cos1 + b2 * cos2;
  const numI = -(b1 * sin1 + b2 * sin2);
  const denR = 1 + a1 * cos1 + a2 * cos2;
  const denI = -(a1 * sin1 + a2 * sin2);

  const numMag2 = numR * numR + numI * numI;
  const denMag2 = denR * denR + denI * denI;

  return denMag2 > 0 ? Math.sqrt(numMag2 / denMag2) : 1;
}

function computeBiquadCoeffs(type: FilterType, cutoff: number, q: number) {
  const SR = 44100;
  const w0 = (2 * Math.PI * cutoff) / SR;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2; b1 = 1 - cosW0; b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cosW0) / 2; b1 = -(1 + cosW0); b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = sinW0 / 2; b1 = 0; b2 = -sinW0 / 2;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1; b1 = -2 * cosW0; b2 = 1;
      a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;
      break;
  }

  return {
    b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
    a1: a1 / a0, a2: a2 / a0,
  };
}

function drawFrequencyResponse(ctx: CanvasRenderingContext2D, filters: FilterDef[]) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid
  ctx.strokeStyle = '#1e1e2e';
  ctx.lineWidth = 1;
  // Frequency grid lines at 100, 1k, 10k Hz
  const freqMarkers = [20, 100, 500, 1000, 5000, 10000, 20000];
  for (const f of freqMarkers) {
    const xN = Math.log(f / 20) / Math.log(20000 / 20);
    const x = xN * CANVAS_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  // dB grid at 0 and -20dB
  for (const db of [0, -6, -12, -20]) {
    const lin = Math.pow(10, db / 20);
    const y = (1 - lin) * CANVAS_H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Frequency labels
  ctx.fillStyle = '#404050';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  const labelMap: Record<number, string> = { 100: '100', 1000: '1k', 10000: '10k' };
  for (const f of [100, 1000, 10000]) {
    const xN = Math.log(f / 20) / Math.log(20000 / 20);
    ctx.fillText(labelMap[f]!, xN * CANVAS_W, CANVAS_H - 2);
  }

  if (filters.length === 0) {
    // Flat line at 0dB
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CANVAS_W, 0);
    ctx.strokeStyle = '#3a5a80';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  // Compute combined magnitude response
  const points: { x: number; y: number }[] = [];
  const numPoints = CANVAS_W;
  const SR = 44100;

  for (let px = 0; px < numPoints; px++) {
    const xN = px / (numPoints - 1);
    const freq = 20 * Math.pow(20000 / 20, xN);
    const w = (2 * Math.PI * freq) / SR;

    let mag = 1;
    for (const f of filters) {
      const c = computeBiquadCoeffs(f.type, f.cutoff, f.q);
      mag *= biquadMagnitude(c.b0, c.b1, c.b2, c.a1, c.a2, w);
    }

    // Map magnitude to y (clamped to -40dB floor)
    const db = 20 * Math.log10(Math.max(mag, 0.01));
    const yN = 1 - Math.max(-40, Math.min(20, db + 20)) / 60;
    points.push({ x: px, y: yN * CANVAS_H });
  }

  // Fill under curve
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, 'rgba(80, 160, 200, 0.3)');
  grad.addColorStop(1, 'rgba(80, 160, 200, 0.05)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Curve
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = '#50a0c8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Filter row
// ---------------------------------------------------------------------------

interface FilterRowProps {
  filter: FilterDef;
}

function sliderToFreq(v: number): number {
  return 20 * Math.pow(20000 / 20, v);
}
function freqToSlider(hz: number): number {
  return Math.log(hz / 20) / Math.log(20000 / 20);
}
function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}`;
}

function FilterRow({ filter }: FilterRowProps) {
  const updateFilter = useSfxStore((s) => s.updateFilter);
  const removeFilter = useSfxStore((s) => s.removeFilter);

  const set = (patch: Partial<FilterDef>) => updateFilter(filter.id, patch);

  return (
    <div style={styles.filterCard}>
      <div style={styles.filterHeader}>
        {/* Filter type selector */}
        <div style={styles.typeRow}>
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set({ type: t })}
              style={{
                ...styles.typeBtn,
                background: filter.type === t ? '#2a3a5a' : '#1a1a2a',
                border: filter.type === t ? '1px solid #4a6ab0' : '1px solid #2a2a3a',
                color: filter.type === t ? '#80a8e8' : '#505070',
              }}
            >
              {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : t === 'bandpass' ? 'BP' : 'N'}
            </button>
          ))}
        </div>
        <button
          onClick={() => removeFilter(filter.id)}
          style={styles.removeBtn}
          title="Remove filter"
        >
          x
        </button>
      </div>

      <div style={styles.sliderRow}>
        <span style={styles.label}>Cutoff</span>
        <input
          type="range" min={0} max={1} step={0.001}
          value={freqToSlider(filter.cutoff)}
          onChange={(e) => set({ cutoff: sliderToFreq(parseFloat(e.target.value)) })}
          style={styles.slider}
        />
        <span style={styles.value}>{formatHz(filter.cutoff)} Hz</span>
      </div>

      <div style={styles.sliderRow}>
        <span style={styles.label}>Q</span>
        <input
          type="range" min={0.1} max={20} step={0.1}
          value={filter.q}
          onChange={(e) => set({ q: parseFloat(e.target.value) })}
          style={styles.slider}
        />
        <span style={styles.value}>{filter.q.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterChain
// ---------------------------------------------------------------------------

export function FilterChain() {
  const filters = useSfxStore((s) => s.filters);
  const addFilter = useSfxStore((s) => s.addFilter);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFrequencyResponse(ctx, filters);
  }, [filters]);

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>FILTER CHAIN</span>
        <button onClick={addFilter} style={styles.addBtn}>+ ADD</button>
      </div>

      {/* Frequency response visualization */}
      <div style={{ padding: '6px 8px 2px', flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', borderRadius: 3, background: '#161620' }}
        />
      </div>

      <div style={styles.filterList}>
        {filters.length === 0 && (
          <div style={styles.empty}>No filters. Click + ADD to insert one.</div>
        )}
        {filters.map((f) => (
          <FilterRow key={f.id} filter={f} />
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
    background: '#181825',
    borderBottom: '1px solid #2a2a3a',
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
  filterList: {
    padding: '6px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    maxHeight: 240,
  },
  filterCard: {
    background: '#1e1e2e',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    display: 'flex',
    gap: 4,
  },
  typeBtn: {
    borderRadius: 3,
    padding: '2px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid #4a2a2a',
    borderRadius: 3,
    color: '#a05050',
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
  label: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#506070',
    minWidth: 34,
    textAlign: 'right' as const,
  },
  slider: {
    flex: 1,
    accentColor: '#50a0c8',
    cursor: 'pointer',
  },
  value: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#8090b0',
    minWidth: 54,
    textAlign: 'right' as const,
  },
  empty: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#404050',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
};
