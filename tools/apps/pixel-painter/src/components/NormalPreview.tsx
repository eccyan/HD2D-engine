import React, { useRef, useEffect } from 'react';
import { usePainterStore, pixelDims } from '../store/usePainterStore.js';
import { heightmapToNormalMap } from '../lib/normal-map.js';

const PREVIEW_SIZE = 128;

export function NormalPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const heightmapPixels = usePainterStore((s) => s.heightmapPixels);
  const manifest = usePainterStore((s) => s.manifest);
  const editTarget = usePainterStore((s) => s.editTarget);

  const { w, h } = pixelDims({ editTarget, manifest });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Compute normal map from heightmap
    const normalMap = heightmapToNormalMap(heightmapPixels, w, h);
    const imgData = new ImageData(new Uint8ClampedArray(normalMap), w, h);

    // Draw scaled up
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  }, [heightmapPixels, w, h]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>Normal Map Preview</div>
      <canvas
        ref={canvasRef}
        width={PREVIEW_SIZE}
        height={PREVIEW_SIZE}
        style={styles.canvas}
      />
      <div style={styles.hint}>
        Auto-computed from heightmap
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px 10px',
    background: '#1e1e2e',
    borderTop: '1px solid #333',
  },
  header: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: '0.04em',
  },
  canvas: {
    display: 'block',
    imageRendering: 'pixelated',
    border: '1px solid #444',
    borderRadius: 2,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#444',
  },
};
