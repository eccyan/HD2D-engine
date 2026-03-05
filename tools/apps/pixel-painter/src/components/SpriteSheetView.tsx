import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePainterStore } from '../store/usePainterStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sprite sheet layout: 64×192 total, 4 frames × 12 rows of 16×16 */
const SHEET_COLS = 4;
const SHEET_ROWS = 12;
const TILE_SIZE = 16;
const CELL_DISPLAY = 18; // pixels per frame cell in the sheet view

/** Row labels matching Phase 6 spec: 3 states × 4 directions */
const ROW_LABELS: string[] = [
  'idle_S',   // 0
  'idle_N',   // 1
  'idle_E',   // 2
  'idle_W',   // 3
  'walk_S',   // 4
  'walk_N',   // 5
  'walk_E',   // 6
  'walk_W',   // 7
  'run_S',    // 8
  'run_N',    // 9
  'run_E',    // 10
  'run_W',    // 11
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpriteSheetView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animTimerRef = useRef<number | null>(null);

  const {
    selectedFrameCol,
    selectedFrameRow,
    spritesheetPixels,
    selectFrame,
    editTarget,
    setEditTarget,
    animPreviewFps,
    animPreviewPlaying,
    setAnimPreviewFps,
    setAnimPreviewPlaying,
  } = usePainterStore();

  const [hoveredCell, setHoveredCell] = useState<[number, number]>([-1, -1]);
  const [animFrame, setAnimFrame] = useState(0);
  const [loadedImage, setLoadedImage] = useState<ImageData | null>(null);

  const totalWidth = SHEET_COLS * CELL_DISPLAY;
  const totalHeight = SHEET_ROWS * CELL_DISPLAY;

  // Render the sprite sheet view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, totalWidth, totalHeight);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    for (let row = 0; row < SHEET_ROWS; row++) {
      for (let col = 0; col < SHEET_COLS; col++) {
        const x = col * CELL_DISPLAY;
        const y = row * CELL_DISPLAY;
        const key = `${col},${row}`;

        if (loadedImage) {
          const offscreen = document.createElement('canvas');
          offscreen.width = TILE_SIZE;
          offscreen.height = TILE_SIZE;
          const offCtx = offscreen.getContext('2d')!;
          offCtx.putImageData(loadedImage, -(col * TILE_SIZE), -(row * TILE_SIZE));
          ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
        } else {
          const framePixels = spritesheetPixels.get(key);
          if (framePixels) {
            const imgData = new ImageData(new Uint8ClampedArray(framePixels), TILE_SIZE, TILE_SIZE);
            const offscreen = document.createElement('canvas');
            offscreen.width = TILE_SIZE;
            offscreen.height = TILE_SIZE;
            const offCtx = offscreen.getContext('2d')!;
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
          } else {
            const checkSize = 3;
            for (let cy = 0; cy < CELL_DISPLAY; cy += checkSize) {
              for (let cx = 0; cx < CELL_DISPLAY; cx += checkSize) {
                const light = ((Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0);
                ctx.fillStyle = light ? '#2a2a3e' : '#222232';
                ctx.fillRect(x + cx, y + cy, checkSize, checkSize);
              }
            }
          }
        }

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_DISPLAY - 1, CELL_DISPLAY - 1);

        // Selected
        if (col === selectedFrameCol && row === selectedFrameRow && editTarget === 'spritesheet') {
          ctx.strokeStyle = '#f8a84a';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_DISPLAY - 2, CELL_DISPLAY - 2);
        }

        // Animation preview highlight (current row, animated frame)
        if (animPreviewPlaying && row === selectedFrameRow && col === animFrame) {
          ctx.fillStyle = 'rgba(255,200,100,0.2)';
          ctx.fillRect(x, y, CELL_DISPLAY, CELL_DISPLAY);
        }

        // Hover
        if (col === hoveredCell[0] && row === hoveredCell[1]) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, CELL_DISPLAY, CELL_DISPLAY);
        }
      }
    }
  }, [spritesheetPixels, selectedFrameCol, selectedFrameRow, editTarget, hoveredCell, animFrame, animPreviewPlaying, loadedImage, totalWidth, totalHeight]);

  // Animation timer
  useEffect(() => {
    if (animPreviewPlaying) {
      const interval = 1000 / animPreviewFps;
      animTimerRef.current = window.setInterval(() => {
        setAnimFrame((f) => (f + 1) % SHEET_COLS);
      }, interval);
    } else {
      if (animTimerRef.current !== null) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }
      setAnimFrame(0);
    }
    return () => {
      if (animTimerRef.current !== null) clearInterval(animTimerRef.current);
    };
  }, [animPreviewPlaying, animPreviewFps]);

  const getCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_DISPLAY);
    const row = Math.floor((e.clientY - rect.top) / CELL_DISPLAY);
    return [
      Math.max(0, Math.min(SHEET_COLS - 1, col)),
      Math.max(0, Math.min(SHEET_ROWS - 1, row)),
    ];
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const [col, row] = getCell(e);
    if (editTarget !== 'spritesheet') setEditTarget('spritesheet');
    selectFrame(col, row);
  }, [getCell, selectFrame, editTarget, setEditTarget]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveredCell(getCell(e));
  }, [getCell]);

  const handleMouseLeave = useCallback(() => setHoveredCell([-1, -1]), []);

  const handleLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = SHEET_COLS * TILE_SIZE;
        offscreen.height = SHEET_ROWS * TILE_SIZE;
        const ctx = offscreen.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, SHEET_COLS * TILE_SIZE, SHEET_ROWS * TILE_SIZE);
        setLoadedImage(data);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Animation preview canvas (shows current row animated)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewSize = 64; // 64x64 display

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, previewSize, previewSize);

    // Checkerboard bg
    const checkSize = 8;
    for (let cy = 0; cy < previewSize; cy += checkSize) {
      for (let cx = 0; cx < previewSize; cx += checkSize) {
        const light = ((Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0);
        ctx.fillStyle = light ? '#333' : '#222';
        ctx.fillRect(cx, cy, checkSize, checkSize);
      }
    }

    const frameCol = animPreviewPlaying ? animFrame : selectedFrameCol;
    const key = `${frameCol},${selectedFrameRow}`;
    const framePixels = spritesheetPixels.get(key);
    if (framePixels) {
      const imgData = new ImageData(new Uint8ClampedArray(framePixels), TILE_SIZE, TILE_SIZE);
      const offscreen = document.createElement('canvas');
      offscreen.width = TILE_SIZE;
      offscreen.height = TILE_SIZE;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, previewSize, previewSize);
    }
  }, [spritesheetPixels, selectedFrameCol, selectedFrameRow, animFrame, animPreviewPlaying, previewSize]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>Sprite Sheet</span>
        <span style={styles.subtitle}>64×192 / 4×12 frames</span>
      </div>

      <div style={styles.body}>
        {/* Row labels */}
        <div style={styles.rowLabels}>
          {ROW_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                ...styles.rowLabel,
                color: i === selectedFrameRow ? '#f8a84a' : '#555',
                height: CELL_DISPLAY,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Sheet canvas */}
        <canvas
          ref={canvasRef}
          width={totalWidth}
          height={totalHeight}
          style={styles.canvas}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Selection info */}
      <div style={styles.info}>
        <span style={styles.infoLabel}>
          {ROW_LABELS[selectedFrameRow]} frame {selectedFrameCol}
        </span>
      </div>

      {/* Animation preview */}
      <div style={styles.previewSection}>
        <div style={styles.previewHeader}>
          <span style={styles.previewLabel}>Preview ({ROW_LABELS[selectedFrameRow]})</span>
          <button
            onClick={() => setAnimPreviewPlaying(!animPreviewPlaying)}
            style={{
              ...styles.playBtn,
              background: animPreviewPlaying ? '#3a2a1a' : '#1a3a1a',
              borderColor: animPreviewPlaying ? '#7a4a1a' : '#3a7a3a',
              color: animPreviewPlaying ? '#e0a040' : '#70d870',
            }}
          >
            {animPreviewPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
        <div style={styles.previewRow}>
          <canvas
            ref={previewCanvasRef}
            width={previewSize}
            height={previewSize}
            style={styles.previewCanvas}
          />
          <div style={styles.fpsControl}>
            <span style={styles.fpsLabel}>FPS</span>
            <input
              type="range"
              min={1}
              max={24}
              value={animPreviewFps}
              onChange={(e) => setAnimPreviewFps(parseInt(e.target.value))}
              style={styles.fpsSlider}
            />
            <span style={styles.fpsValue}>{animPreviewFps}</span>
          </div>
        </div>
      </div>

      {/* Load PNG */}
      <button onClick={() => fileInputRef.current?.click()} style={styles.loadBtn}>
        Load Sprite Sheet PNG
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        style={{ display: 'none' }}
        onChange={handleLoadFile}
      />
    </div>
  );
}

const previewSize = 64;

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 10px',
    background: '#1e1e2e',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    color: '#ccc',
    letterSpacing: '0.04em',
  },
  subtitle: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
  },
  body: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
  },
  rowLabels: {
    display: 'flex',
    flexDirection: 'column',
  },
  rowLabel: {
    fontFamily: 'monospace',
    fontSize: 7,
    display: 'flex',
    alignItems: 'center',
    paddingRight: 3,
    flexShrink: 0,
  },
  canvas: {
    display: 'block',
    cursor: 'pointer',
    imageRendering: 'pixelated',
    border: '1px solid #333',
  },
  info: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#aaa',
  },
  infoLabel: {},
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
  },
  playBtn: {
    border: '1px solid',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  previewCanvas: {
    display: 'block',
    imageRendering: 'pixelated',
    border: '1px solid #333',
    width: previewSize,
    height: previewSize,
  },
  fpsControl: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  fpsLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
  },
  fpsSlider: {
    width: 60,
    accentColor: '#4a9ef8',
  },
  fpsValue: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#aaa',
  },
  loadBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '4px 8px',
    cursor: 'pointer',
    marginTop: 2,
  },
};
