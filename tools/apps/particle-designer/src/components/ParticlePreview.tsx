import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { EmitterConfig } from '../store/useParticleStore.js';

// ---------------------------------------------------------------------------
// Local particle simulation (mirrors engine particle physics)
// ---------------------------------------------------------------------------

interface Particle {
  // position (canvas-space, relative to emitter center)
  x: number;
  y: number;
  // velocity (world units/s, Y+ = up in logical space → canvas -Y)
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  // lifetime
  age: number;
  lifetime: number;
  // visual
  startSize: number;
  endSize: number;
  startColor: [number, number, number, number];
  endColor: [number, number, number, number];
  atlasTile: number;
}

// World → canvas scale: 1 world unit = SCALE pixels
const SCALE = 60;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number,
): [number, number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnParticle(cfg: EmitterConfig, cx: number, cy: number): Particle {
  const ox = rand(cfg.spawn_offset_min[0], cfg.spawn_offset_max[0]);
  const oy = rand(cfg.spawn_offset_min[1], cfg.spawn_offset_max[1]);
  const vx = rand(cfg.min_velocity[0], cfg.max_velocity[0]);
  const vy = rand(cfg.min_velocity[1], cfg.max_velocity[1]);
  return {
    x: cx + ox * SCALE,
    y: cy + oy * SCALE,
    vx,
    vy,
    ax: cfg.acceleration[0],
    ay: cfg.acceleration[1],
    age: 0,
    lifetime: rand(cfg.min_lifetime, cfg.max_lifetime),
    startSize: cfg.start_size,
    endSize: cfg.end_size,
    startColor: [...cfg.start_color] as [number, number, number, number],
    endColor: [...cfg.end_color] as [number, number, number, number],
    atlasTile: cfg.atlas_tile,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const t = p.age / p.lifetime;
  const size = lerp(p.startSize, p.endSize, t) * SCALE;
  if (size <= 0) return;

  const color = lerpColor(p.startColor, p.endColor, t);
  const [r, g, b, a] = color;
  if (a <= 0) return;

  const cssColor = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a.toFixed(3)})`;

  ctx.save();
  ctx.translate(p.x, p.y);

  switch (p.atlasTile) {
    case 0: // Circle — solid filled circle
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = cssColor;
      ctx.fill();
      break;

    case 1: // SoftGlow — radial gradient
      {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
        grad.addColorStop(0, cssColor);
        grad.addColorStop(1, `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0)`);
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      break;

    case 2: // Spark — thin elongated line
      {
        ctx.strokeStyle = cssColor;
        ctx.lineWidth = Math.max(1, size * 0.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(0, size * 0.6);
        ctx.stroke();
      }
      break;

    case 3: // SmokePuff — soft blurred circle with low opacity
      {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
        const smokeA = a * 0.6;
        grad.addColorStop(
          0,
          `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${smokeA.toFixed(3)})`,
        );
        grad.addColorStop(1, `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0)`);
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      break;

    case 4: // Raindrop — vertical elongated teardrop
      {
        ctx.fillStyle = cssColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.15, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 5: // Snowflake — 6-armed star
      {
        ctx.strokeStyle = cssColor;
        ctx.lineWidth = Math.max(0.5, size * 0.12);
        const arms = 6;
        for (let i = 0; i < arms; i++) {
          const angle = (i / arms) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * size * 0.5, Math.sin(angle) * size * 0.5);
          ctx.stroke();
        }
      }
      break;

    default:
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = cssColor;
      ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// ParticlePreview component
// ---------------------------------------------------------------------------
interface ParticlePreviewProps {
  config: EmitterConfig | null;
}

export function ParticlePreview({ config }: ParticlePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const spawnAccRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const playingRef = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef({ count: 0, lastTime: 0 });
  const configRef = useRef<EmitterConfig | null>(config);

  // Keep configRef in sync
  useEffect(() => {
    configRef.current = config;
    // Reset particles when config changes significantly
    particlesRef.current = [];
    spawnAccRef.current = 0;
  }, [config]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const tick = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = lastTimeRef.current !== null ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0;
    lastTimeRef.current = time;

    const cfg = configRef.current;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // FPS counter
    const fpsC = fpsCounterRef.current;
    fpsC.count++;
    if (time - fpsC.lastTime >= 500) {
      setFps(Math.round((fpsC.count / (time - fpsC.lastTime)) * 1000));
      fpsC.count = 0;
      fpsC.lastTime = time;
    }

    // --- Clear ---
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    // --- Grid ---
    drawGrid(ctx, W, H);

    // --- Emitter crosshair ---
    ctx.strokeStyle = '#3a2a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    if (!cfg) {
      // No config: just render empty canvas
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (playingRef.current && dt > 0) {
      // --- Spawn new particles ---
      spawnAccRef.current += cfg.spawn_rate * dt;
      const toSpawn = Math.floor(spawnAccRef.current);
      spawnAccRef.current -= toSpawn;
      const MAX_PARTICLES = 600;
      for (let i = 0; i < toSpawn; i++) {
        if (particlesRef.current.length < MAX_PARTICLES) {
          particlesRef.current.push(spawnParticle(cfg, cx, cy));
        }
      }

      // --- Update particles ---
      // Engine uses Y+ = up; canvas Y+ = down, so we negate canvas-Y velocity
      const p = particlesRef.current;
      for (let i = p.length - 1; i >= 0; i--) {
        const par = p[i];
        par.vx += par.ax * dt;
        par.vy += par.ay * dt;
        par.x += par.vx * dt * SCALE;
        par.y -= par.vy * dt * SCALE; // canvas Y inverted
        par.age += dt;
        if (par.age >= par.lifetime) {
          p.splice(i, 1);
        }
      }
    }

    // --- Draw particles (back-to-front by alpha for nice blending) ---
    ctx.globalCompositeOperation = 'source-over';
    for (const par of particlesRef.current) {
      drawParticle(ctx, par);
    }

    // --- Particle count ---
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(4, 4, 120, 16);
    ctx.fillStyle = '#8070b0';
    ctx.font = '10px monospace';
    ctx.fillText(`particles: ${particlesRef.current.length}`, 8, 16);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Mount / unmount animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      observer.observe(parent);
    }
    return () => observer.disconnect();
  }, []);

  const handlePlayPause = () => {
    setPlaying((p) => !p);
  };

  const handleClear = () => {
    particlesRef.current = [];
    spawnAccRef.current = 0;
  };

  return (
    <div style={styles.container}>
      {/* Canvas area */}
      <div style={styles.canvasWrapper}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button onClick={handlePlayPause} style={styles.toolBtn}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleClear} style={styles.toolBtn}>
          Clear
        </button>
        <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
          {fps} fps
        </span>
        {config && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
            · rate={config.spawn_rate}/s · tile={TILE_NAMES[config.atlas_tile] ?? config.atlas_tile}
          </span>
        )}
        {!playing && (
          <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 10, color: '#8060a0' }}>
            [PAUSED]
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid helper
// ---------------------------------------------------------------------------
function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const gridSize = SCALE; // 1 world unit = SCALE px
  ctx.strokeStyle = '#151522';
  ctx.lineWidth = 1;

  const startX = (W / 2) % gridSize;
  const startY = (H / 2) % gridSize;

  ctx.beginPath();
  for (let x = startX; x < W; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = startY; y < H; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  // Center axes
  ctx.strokeStyle = '#1e1e38';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
}

const TILE_NAMES = ['Circle', 'SoftGlow', 'Spark', 'SmokePuff', 'Raindrop', 'Snowflake'];

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#0a0a14',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    background: '#111120',
    borderTop: '1px solid #1e1e30',
    flexShrink: 0,
  },
  toolBtn: {
    background: '#1e1a30',
    border: '1px solid #3a2a5a',
    borderRadius: 4,
    color: '#a080d0',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '3px 10px',
    cursor: 'pointer',
  },
};
