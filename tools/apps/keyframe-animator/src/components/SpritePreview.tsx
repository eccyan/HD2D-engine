import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAnimatorStore,
  getSelectedClip,
  getFrameAtTime,
  tileUVs,
  TilesetConfig,
} from '../store/useAnimatorStore.js';

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

function drawSpriteSheet(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tileset: TilesetConfig,
  activeFrameIndex: number,
  clip_tile_ids: number[],
  canvasW: number,
  canvasH: number,
) {
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Background
  ctx.fillStyle = '#0e0e1a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Checkerboard for transparency
  const cSize = 8;
  for (let cy = 0; cy * cSize < canvasH; cy++) {
    for (let cx = 0; cx * cSize < canvasW; cx++) {
      ctx.fillStyle = (cx + cy) % 2 === 0 ? '#1a1a28' : '#222233';
      ctx.fillRect(cx * cSize, cy * cSize, cSize, cSize);
    }
  }

  if (!img.complete || img.naturalWidth === 0) return;

  const { tile_width, tile_height, columns, sheet_width, sheet_height } = tileset;
  const totalTiles = Math.floor(sheet_width / tile_width) * Math.floor(sheet_height / tile_height);
  const cols = columns;
  const rows = Math.ceil(totalTiles / cols);

  // Scale to fit canvas keeping aspect ratio
  const scale = Math.min(canvasW / sheet_width, canvasH / sheet_height, 3);
  const drawW = sheet_width * scale;
  const drawH = sheet_height * scale;
  const ox = Math.floor((canvasW - drawW) / 2);
  const oy = Math.floor((canvasH - drawH) / 2);

  // Draw sprite sheet image
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, ox, oy, drawW, drawH);

  // Draw grid overlay
  ctx.strokeStyle = '#ffffff18';
  ctx.lineWidth = 1;
  const tw = tile_width * scale;
  const th = tile_height * scale;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(ox + c * tw, oy);
    ctx.lineTo(ox + c * tw, oy + rows * th);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + r * th);
    ctx.lineTo(ox + cols * tw, oy + r * th);
    ctx.stroke();
  }

  // Dim all tiles not in current clip
  const clipTileSet = new Set(clip_tile_ids);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileId = r * cols + c;
      if (!clipTileSet.has(tileId)) {
        ctx.fillStyle = '#00000088';
        ctx.fillRect(ox + c * tw, oy + r * th, tw, th);
      }
    }
  }

  // Highlight frames in clip (dim shade)
  clip_tile_ids.forEach((tileId, fi) => {
    const col = tileId % cols;
    const row = Math.floor(tileId / cols);
    if (fi !== activeFrameIndex) {
      ctx.fillStyle = '#4488cc33';
      ctx.fillRect(ox + col * tw + 1, oy + row * th + 1, tw - 2, th - 2);
    }
  });

  // Active frame highlight
  if (activeFrameIndex >= 0 && activeFrameIndex < clip_tile_ids.length) {
    const tileId = clip_tile_ids[activeFrameIndex];
    const col = tileId % cols;
    const row = Math.floor(tileId / cols);
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + col * tw + 1, oy + row * th + 1, tw - 2, th - 2);
    // Semi-fill
    ctx.fillStyle = '#f0c04022';
    ctx.fillRect(ox + col * tw + 1, oy + row * th + 1, tw - 2, th - 2);

    // Frame index label
    ctx.fillStyle = '#f0c040';
    ctx.font = `bold ${Math.max(8, Math.floor(th * 0.35))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(activeFrameIndex), ox + col * tw + tw / 2, oy + row * th + th / 2);
  }
}

// ---------------------------------------------------------------------------
// SpritePreview
// ---------------------------------------------------------------------------

export function SpritePreview() {
  const tileset = useAnimatorStore((s) => s.tileset);
  const spriteSheetUrl = useAnimatorStore((s) => s.spriteSheetUrl);
  const selectedClipId = useAnimatorStore((s) => s.selectedClipId);
  const clips = useAnimatorStore((s) => s.clips);
  const selectedFrameIndex = useAnimatorStore((s) => s.selectedFrameIndex);
  const playbackState = useAnimatorStore((s) => s.playbackState);
  const currentTime = useAnimatorStore((s) => s.currentTime);
  const { setSpriteSheetUrl, updateTileset } = useAnimatorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 280 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clip = clips.find((c) => c.id === selectedClipId) ?? null;

  const activeFrameIndex = clip
    ? playbackState === 'playing' || playbackState === 'paused'
      ? getFrameAtTime(clip, currentTime)
      : (selectedFrameIndex ?? 0)
    : 0;

  const clip_tile_ids = clip?.frames.map((f) => f.tile_id) ?? [];
  const activeFrame = clip?.frames[activeFrameIndex];
  const uvs = activeFrame ? tileUVs(activeFrame.tile_id, tileset) : null;

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load sprite sheet
  useEffect(() => {
    if (!spriteSheetUrl) {
      imgRef.current = null;
      setImgLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      // Auto-fill sheet dimensions
      updateTileset({ sheet_width: img.naturalWidth, sheet_height: img.naturalHeight });
    };
    img.onerror = () => setImgLoaded(false);
    img.src = spriteSheetUrl;
  }, [spriteSheetUrl]);

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.scale(dpr, dpr);

    if (imgRef.current && imgLoaded) {
      drawSpriteSheet(
        ctx,
        imgRef.current,
        tileset,
        activeFrameIndex,
        clip_tile_ids,
        canvasSize.w,
        canvasSize.h,
      );
    } else {
      // Placeholder
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      ctx.fillStyle = '#0e0e1a';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      const cSize = 8;
      for (let cy = 0; cy * cSize < canvasSize.h; cy++) {
        for (let cx = 0; cx * cSize < canvasSize.w; cx++) {
          ctx.fillStyle = (cx + cy) % 2 === 0 ? '#1a1a28' : '#222233';
          ctx.fillRect(cx * cSize, cy * cSize, cSize, cSize);
        }
      }
      ctx.fillStyle = '#444';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Load a sprite sheet PNG', canvasSize.w / 2, canvasSize.h / 2 - 10);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#333';
      ctx.fillText('(drag & drop or click below)', canvasSize.w / 2, canvasSize.h / 2 + 12);
    }
  }, [imgLoaded, tileset, activeFrameIndex, clip_tile_ids, canvasSize]);

  // Drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setSpriteSheetUrl(url);
  }, [setSpriteSheetUrl]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSpriteSheetUrl(url);
  }, [setSpriteSheetUrl]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#131320',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '4px 8px',
          background: '#1a1a2a',
          borderBottom: '1px solid #2a2a3a',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
          SPRITE PREVIEW
        </span>
        <div style={{ flex: 1 }} />
        <label
          style={{
            background: '#222233',
            border: '1px solid #333',
            borderRadius: 3,
            color: '#888',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          Load PNG
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </label>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />
      </div>

      {/* Info bar */}
      <div
        style={{
          padding: '4px 8px',
          background: '#1a1a2a',
          borderTop: '1px solid #2a2a3a',
          display: 'flex',
          gap: 12,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {activeFrame && (
          <>
            <InfoChip label="Frame" value={String(activeFrameIndex)} />
            <InfoChip label="Tile" value={String(activeFrame.tile_id)} />
            {uvs && (
              <>
                <InfoChip label="UV" value={`(${uvs.u}, ${uvs.v})`} />
                <InfoChip label="Size" value={`${uvs.w}×${uvs.h}`} />
              </>
            )}
            <InfoChip label="Dur" value={`${activeFrame.duration.toFixed(3)}s`} />
          </>
        )}
        {!activeFrame && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#444' }}>
            No clip selected
          </span>
        )}
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#666' }}>
      <span style={{ color: '#444' }}>{label}:</span>{' '}
      <span style={{ color: '#90b8f8' }}>{value}</span>
    </span>
  );
}
