import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSfxStore, type AdsrEnvelope } from '../store/useSfxStore.js';

// ---------------------------------------------------------------------------
// ADSR Canvas
// ---------------------------------------------------------------------------

const CANVAS_W = 320;
const CANVAS_H = 140;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 16;

const INNER_W = CANVAS_W - PAD_L - PAD_R;
const INNER_H = CANVAS_H - PAD_T - PAD_B;

type HandleName = 'attack' | 'decay' | 'sustain' | 'release';

interface Handle {
  name: HandleName;
  x: number; // canvas pixel
  y: number; // canvas pixel
}

function envelopeHandles(env: AdsrEnvelope): Handle[] {
  const dur = env.duration;
  // Map each segment to its right-edge time fraction
  const tA = env.attack / dur;
  const tD = (env.attack + env.decay) / dur;
  const tR = 1.0; // release always ends at duration

  const xA = PAD_L + tA * INNER_W;
  const xD = PAD_L + tD * INNER_W;
  const xR = PAD_L + tR * INNER_W;

  // The sustain level sits at the decay end-point
  const yTop    = PAD_T;
  const yBottom = PAD_T + INNER_H;
  const yA = yTop; // peak of attack
  const yD = yTop + (1 - env.sustain) * INNER_H; // sustain level
  const yR = yBottom; // silent end

  return [
    { name: 'attack',   x: xA, y: yA },
    { name: 'decay',    x: xD, y: yD },
    { name: 'sustain',  x: xD, y: yD }, // same x as decay, dragging y only
    { name: 'release',  x: xR, y: yR },
  ];
}

function drawEnvelope(ctx: CanvasRenderingContext2D, env: AdsrEnvelope, hoveredHandle: HandleName | null) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background grid
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD_T + (i / 4) * INNER_H;
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(PAD_L + INNER_W, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const x = PAD_L + (i / 4) * INNER_W;
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, PAD_T + INNER_H);
    ctx.stroke();
  }

  const handles = envelopeHandles(env);
  const [hA, hD] = handles;

  // Fill under curve
  const startX = PAD_L;
  const startY = PAD_T + INNER_H;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(hA!.x, hA!.y);  // attack peak
  ctx.lineTo(hD!.x, hD!.y);  // sustain level

  // Sustain line to release
  const releaseStartX = PAD_L + INNER_W;
  ctx.lineTo(releaseStartX, hD!.y);
  ctx.lineTo(releaseStartX, startY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + INNER_H);
  grad.addColorStop(0, 'rgba(96, 144, 220, 0.35)');
  grad.addColorStop(1, 'rgba(96, 144, 220, 0.06)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Curve stroke
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(hA!.x, hA!.y);
  ctx.lineTo(hD!.x, hD!.y);
  ctx.lineTo(releaseStartX, hD!.y);
  ctx.lineTo(releaseStartX, startY);
  ctx.strokeStyle = '#6090e0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw handles (skip 'sustain' which is same point as 'decay')
  const drawnHandles: Handle[] = [handles[0]!, handles[1]!, handles[3]!];
  for (const h of drawnHandles) {
    const hovered = hoveredHandle === h.name;
    ctx.beginPath();
    ctx.arc(h.x, h.y, hovered ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = hovered ? '#a0c8ff' : '#6090e0';
    ctx.fill();
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Labels
  ctx.fillStyle = '#506080';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const labelY = PAD_T + INNER_H + PAD_B - 2;
  ctx.fillText('A', hA!.x, labelY);
  ctx.fillText('D/S', hD!.x, labelY);
  ctx.fillText('R', releaseStartX, labelY);
}

// ---------------------------------------------------------------------------
// EnvelopeEditor
// ---------------------------------------------------------------------------

export function EnvelopeEditor() {
  const envelope = useSfxStore((s) => s.envelope);
  const setEnvelope = useSfxStore((s) => s.setEnvelope);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<HandleName | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleName | null>(null);

  // Redraw whenever envelope changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawEnvelope(ctx, envelope, hoveredHandle);
  }, [envelope, hoveredHandle]);

  // Hit-test for nearest handle (returns name or null)
  const hitTest = useCallback((cx: number, cy: number): HandleName | null => {
    const handles = envelopeHandles(envelope);
    const unique: Handle[] = [handles[0]!, handles[1]!, handles[3]!];
    let best: HandleName | null = null;
    let bestDist = 12; // px threshold
    for (const h of unique) {
      const d = Math.hypot(cx - h.x, cy - h.y);
      if (d < bestDist) {
        bestDist = d;
        best = h.name;
      }
    }
    return best;
  }, [envelope]);

  const getCanvasPos = (e: React.MouseEvent): { cx: number; cy: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      cy: (e.clientY - rect.top)  * (CANVAS_H / rect.height),
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasPos(e);
    const hit = hitTest(cx, cy);
    draggingRef.current = hit;
  }, [hitTest]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const { cx, cy } = getCanvasPos(e);

    if (!draggingRef.current) {
      setHoveredHandle(hitTest(cx, cy));
      return;
    }

    const name = draggingRef.current;
    const dur = envelope.duration;

    // X maps to time, Y maps to level
    const tNorm = Math.max(0, Math.min(1, (cx - PAD_L) / INNER_W));
    const lNorm = Math.max(0, Math.min(1, 1 - (cy - PAD_T) / INNER_H));
    const tSec  = tNorm * dur;

    if (name === 'attack') {
      const maxAttack = dur - envelope.decay - 0.01;
      setEnvelope({ attack: Math.max(0, Math.min(tSec, maxAttack)) });
    } else if (name === 'decay') {
      const decayEnd = tSec;
      const newDecay = Math.max(0, decayEnd - envelope.attack);
      const newSustain = Math.max(0, Math.min(1, lNorm));
      setEnvelope({ decay: Math.min(newDecay, dur - envelope.attack - 0.01), sustain: newSustain });
    } else if (name === 'release') {
      // Dragging release: adjust release time (duration stays fixed, release = time from tNorm to end)
      const releaseStart = tNorm * dur;
      const minRelease = dur - envelope.attack - envelope.decay;
      const newRelease = Math.max(0.01, dur - releaseStart);
      if (newRelease < minRelease + 0.05) {
        setEnvelope({ release: Math.max(0.01, newRelease) });
      } else {
        setEnvelope({ release: Math.max(0.01, Math.min(newRelease, dur)) });
      }
    }
  }, [envelope, hitTest, setEnvelope]);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // Numeric inputs
  const numInput = (
    label: string,
    key: keyof AdsrEnvelope,
    min: number,
    max: number,
    step: number,
    suffix: string,
  ) => {
    const value = envelope[key] as number;
    return (
      <div style={styles.inputRow}>
        <span style={styles.inputLabel}>{label}</span>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => setEnvelope({ [key]: parseFloat(e.target.value) } as Partial<AdsrEnvelope>)}
          style={styles.slider}
        />
        <input
          type="number"
          min={min} max={max} step={step}
          value={value.toFixed(step < 0.1 ? 3 : 2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setEnvelope({ [key]: Math.max(min, Math.min(max, v)) } as Partial<AdsrEnvelope>);
          }}
          style={styles.numInput}
        />
        <span style={styles.suffix}>{suffix}</span>
      </div>
    );
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>ENVELOPE (ADSR)</span>
      </div>

      {/* Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 8px 4px', flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ borderRadius: 4, background: '#161620', cursor: draggingRef.current ? 'grabbing' : 'crosshair', width: '100%', maxWidth: CANVAS_W }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Numeric controls */}
      <div style={styles.controls}>
        {numInput('Attack',  'attack',   0,    2,    0.001, 's')}
        {numInput('Decay',   'decay',    0,    2,    0.001, 's')}
        {numInput('Sustain', 'sustain',  0,    1,    0.01,  '')}
        {numInput('Release', 'release',  0,    2,    0.001, 's')}
        {numInput('Length',  'duration', 0.01, 5,    0.01,  's')}
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
  controls: {
    padding: '6px 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#606080',
    minWidth: 46,
    textAlign: 'right' as const,
  },
  slider: {
    flex: 1,
    accentColor: '#6080c0',
    cursor: 'pointer',
  },
  numInput: {
    width: 54,
    background: '#1a1a2a',
    border: '1px solid #333',
    borderRadius: 3,
    color: '#a0a0c0',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 4px',
    textAlign: 'right' as const,
    outline: 'none',
  },
  suffix: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#505060',
    minWidth: 10,
  },
};
