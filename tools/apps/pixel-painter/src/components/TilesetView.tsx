import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePainterStore } from '../store/usePainterStore.js';

const CELL_DISPLAY = 20; // pixels per tile cell in the sheet view

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TilesetView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { selectedTileCol, selectedTileRow, tilesetPixels, tilesetHeightmaps, selectTile, editTarget, setEditTarget, manifest, activeLayer } = usePainterStore();

  const [loadedImage, setLoadedImage] = useState<ImageData | null>(null);
  const [hoveredTile, setHoveredTile] = useState<[number, number]>([-1, -1]);

  const { tile_width: TILE_W, tile_height: TILE_H, columns: COLS, rows: ROWS, slots } = manifest.tileset;

  const totalWidth = COLS * CELL_DISPLAY;
  const totalHeight = ROWS * CELL_DISPLAY;

  // Build label lookup from manifest slots
  const slotLabels = new Map<number, string>();
  for (const slot of slots) {
    slotLabels.set(slot.id, slot.label);
  }

  // Render the tileset view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, totalWidth, totalHeight);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * CELL_DISPLAY;
        const y = row * CELL_DISPLAY;
        const key = `${col},${row}`;

        if (loadedImage && activeLayer === 'diffuse') {
          const offscreen = document.createElement('canvas');
          offscreen.width = TILE_W;
          offscreen.height = TILE_H;
          const offCtx = offscreen.getContext('2d')!;
          offCtx.putImageData(loadedImage, -(col * TILE_W), -(row * TILE_H));
          ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
        } else if (activeLayer === 'heightmap') {
          // Show grayscale heightmap thumbnail
          const hmData = tilesetHeightmaps.get(key);
          if (hmData) {
            const rgbaData = new Uint8ClampedArray(TILE_W * TILE_H * 4);
            for (let i = 0; i < TILE_W * TILE_H; i++) {
              const h = hmData[i];
              rgbaData[i * 4] = h;
              rgbaData[i * 4 + 1] = h;
              rgbaData[i * 4 + 2] = h;
              rgbaData[i * 4 + 3] = 255;
            }
            const imgData = new ImageData(rgbaData, TILE_W, TILE_H);
            const offscreen = document.createElement('canvas');
            offscreen.width = TILE_W;
            offscreen.height = TILE_H;
            const offCtx = offscreen.getContext('2d')!;
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
          } else {
            // Show mid-gray for blank heightmap
            ctx.fillStyle = '#808080';
            ctx.fillRect(x, y, CELL_DISPLAY, CELL_DISPLAY);
          }
        } else {
          const tilePixels = tilesetPixels.get(key);
          if (tilePixels) {
            const imgData = new ImageData(new Uint8ClampedArray(tilePixels), TILE_W, TILE_H);
            const offscreen = document.createElement('canvas');
            offscreen.width = TILE_W;
            offscreen.height = TILE_H;
            const offCtx = offscreen.getContext('2d')!;
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
          } else {
            const checkSize = 4;
            for (let cy = 0; cy < CELL_DISPLAY; cy += checkSize) {
              for (let cx = 0; cx < CELL_DISPLAY; cx += checkSize) {
                const light = ((Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0);
                ctx.fillStyle = light ? '#2a2a3e' : '#222232';
                ctx.fillRect(x + cx, y + cy, checkSize, checkSize);
              }
            }
          }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_DISPLAY - 1, CELL_DISPLAY - 1);

        if (col === selectedTileCol && row === selectedTileRow && editTarget === 'tileset') {
          ctx.strokeStyle = '#4a9ef8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_DISPLAY - 2, CELL_DISPLAY - 2);
        }

        if (col === hoveredTile[0] && row === hoveredTile[1]) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x, y, CELL_DISPLAY, CELL_DISPLAY);
        }
      }
    }
  }, [tilesetPixels, tilesetHeightmaps, selectedTileCol, selectedTileRow, editTarget, hoveredTile, loadedImage, totalWidth, totalHeight, COLS, ROWS, TILE_W, TILE_H, activeLayer]);

  const getCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_DISPLAY);
    const row = Math.floor((e.clientY - rect.top) / CELL_DISPLAY);
    return [
      Math.max(0, Math.min(COLS - 1, col)),
      Math.max(0, Math.min(ROWS - 1, row)),
    ];
  }, [COLS, ROWS]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const [col, row] = getCell(e);
    if (editTarget !== 'tileset') setEditTarget('tileset');
    selectTile(col, row);
  }, [getCell, selectTile, editTarget, setEditTarget]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveredTile(getCell(e));
  }, [getCell]);

  const handleMouseLeave = useCallback(() => {
    setHoveredTile([-1, -1]);
  }, []);

  const handleLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = COLS * TILE_W;
        offscreen.height = ROWS * TILE_H;
        const ctx = offscreen.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, COLS * TILE_W, ROWS * TILE_H);
        setLoadedImage(data);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [COLS, ROWS, TILE_W, TILE_H]);

  const tileId = selectedTileRow * COLS + selectedTileCol;
  const totalPixelW = COLS * TILE_W;
  const totalPixelH = ROWS * TILE_H;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>Tileset</span>
        <span style={styles.subtitle}>{totalPixelW}x{totalPixelH} / {COLS}x{ROWS} tiles</span>
      </div>

      <canvas
        ref={canvasRef}
        width={totalWidth}
        height={totalHeight}
        style={styles.canvas}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      <div style={styles.tileInfo}>
        <span style={styles.infoLabel}>Selected:</span>
        <span style={styles.infoValue}>
          Tile #{tileId} ({selectedTileCol}, {selectedTileRow})
        </span>
      </div>

      <div style={{ ...styles.labelGrid, gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const id = row * COLS + col;
          const label = slotLabels.get(id);
          const isSelected = col === selectedTileCol && row === selectedTileRow && editTarget === 'tileset';
          return (
            <div
              key={i}
              onClick={() => { if (editTarget !== 'tileset') setEditTarget('tileset'); selectTile(col, row); }}
              style={{
                ...styles.labelCell,
                background: isSelected ? '#1e3a6e' : 'transparent',
                border: isSelected ? '1px solid #4a9ef8' : '1px solid #333',
              }}
              title={`Tile ${id} (col=${col}, row=${row})`}
            >
              <span style={styles.tileIdBadge}>{id}</span>
              {label && <span style={styles.tileLabelText}>{label}</span>}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        style={styles.loadBtn}
      >
        Load Tileset PNG
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

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 10px',
    background: '#1e1e2e',
    borderBottom: '1px solid #333',
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
  canvas: {
    display: 'block',
    cursor: 'pointer',
    imageRendering: 'pixelated',
    border: '1px solid #333',
  },
  tileInfo: {
    display: 'flex',
    gap: 6,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  infoLabel: {
    color: '#666',
  },
  infoValue: {
    color: '#aaa',
  },
  labelGrid: {
    display: 'grid',
    gap: 2,
  },
  labelCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2px 1px',
    borderRadius: 2,
    cursor: 'pointer',
    minHeight: 24,
    justifyContent: 'center',
  },
  tileIdBadge: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#777',
    lineHeight: 1,
  },
  tileLabelText: {
    fontFamily: 'monospace',
    fontSize: 7,
    color: '#555',
    lineHeight: 1,
    marginTop: 1,
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
