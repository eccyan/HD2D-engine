import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePainterStore } from '../store/usePainterStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tileset layout: 128×48 total, each tile 16×16 */
const TILESET_COLS = 8;
const TILESET_ROWS = 3;
const TILE_SIZE = 16;

const CELL_DISPLAY = 20; // pixels per tile cell in the sheet view

// Tile ID labels
const TILE_LABELS: Record<string, string> = {
  '0,0': '0\nfloor',
  '1,0': '1\nwall',
  '2,0': '2\nwater',
  '3,0': '3\nwater',
  '4,0': '4\nwater',
  '5,0': '5\nlava',
  '6,0': '6\nlava',
  '7,0': '7\nlava',
  '0,1': '8\ntorch',
  '1,1': '9\ntorch',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TilesetView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { selectedTileCol, selectedTileRow, tilesetPixels, selectTile, editTarget, setEditTarget } = usePainterStore();

  const [loadedImage, setLoadedImage] = useState<ImageData | null>(null);
  const [hoveredTile, setHoveredTile] = useState<[number, number]>([-1, -1]);

  const totalWidth = TILESET_COLS * CELL_DISPLAY;
  const totalHeight = TILESET_ROWS * CELL_DISPLAY;

  // Render the tileset view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, totalWidth, totalHeight);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw each tile cell
    for (let row = 0; row < TILESET_ROWS; row++) {
      for (let col = 0; col < TILESET_COLS; col++) {
        const x = col * CELL_DISPLAY;
        const y = row * CELL_DISPLAY;
        const key = `${col},${row}`;

        // Try to draw from loaded image first, then from painted pixels
        if (loadedImage) {
          // Crop tile from loaded image
          const offscreen = document.createElement('canvas');
          offscreen.width = TILE_SIZE;
          offscreen.height = TILE_SIZE;
          const offCtx = offscreen.getContext('2d')!;
          offCtx.putImageData(
            loadedImage,
            -(col * TILE_SIZE),
            -(row * TILE_SIZE)
          );
          ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
        } else {
          const tilePixels = tilesetPixels.get(key);
          if (tilePixels) {
            // Draw from painted pixels
            const imgData = new ImageData(new Uint8ClampedArray(tilePixels), TILE_SIZE, TILE_SIZE);
            const offscreen = document.createElement('canvas');
            offscreen.width = TILE_SIZE;
            offscreen.height = TILE_SIZE;
            const offCtx = offscreen.getContext('2d')!;
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(offscreen, x, y, CELL_DISPLAY, CELL_DISPLAY);
          } else {
            // Checkerboard for empty
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

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_DISPLAY - 1, CELL_DISPLAY - 1);

        // Selected highlight
        if (col === selectedTileCol && row === selectedTileRow && editTarget === 'tileset') {
          ctx.strokeStyle = '#4a9ef8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_DISPLAY - 2, CELL_DISPLAY - 2);
        }

        // Hover highlight
        if (col === hoveredTile[0] && row === hoveredTile[1]) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x, y, CELL_DISPLAY, CELL_DISPLAY);
        }
      }
    }
  }, [tilesetPixels, selectedTileCol, selectedTileRow, editTarget, hoveredTile, loadedImage, totalWidth, totalHeight]);

  const getCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_DISPLAY);
    const row = Math.floor((e.clientY - rect.top) / CELL_DISPLAY);
    return [
      Math.max(0, Math.min(TILESET_COLS - 1, col)),
      Math.max(0, Math.min(TILESET_ROWS - 1, row)),
    ];
  }, []);

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
        offscreen.width = TILESET_COLS * TILE_SIZE;
        offscreen.height = TILESET_ROWS * TILE_SIZE;
        const ctx = offscreen.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, TILESET_COLS * TILE_SIZE, TILESET_ROWS * TILE_SIZE);
        setLoadedImage(data);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const tileId = selectedTileRow * TILESET_COLS + selectedTileCol;

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Tileset</span>
        <span style={styles.subtitle}>128×48 / 8×3 tiles</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={totalWidth}
        height={totalHeight}
        style={styles.canvas}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tile info */}
      <div style={styles.tileInfo}>
        <span style={styles.infoLabel}>Selected:</span>
        <span style={styles.infoValue}>
          Tile #{tileId} ({selectedTileCol}, {selectedTileRow})
        </span>
      </div>

      {/* Tile labels grid */}
      <div style={styles.labelGrid}>
        {Array.from({ length: TILESET_ROWS * TILESET_COLS }, (_, i) => {
          const col = i % TILESET_COLS;
          const row = Math.floor(i / TILESET_COLS);
          const id = row * TILESET_COLS + col;
          const label = TILE_LABELS[`${col},${row}`];
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
              {label && <span style={styles.tileLabelText}>{label.split('\n')[1]}</span>}
            </div>
          );
        })}
      </div>

      {/* Load PNG */}
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
    gridTemplateColumns: `repeat(${TILESET_COLS}, 1fr)`,
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
