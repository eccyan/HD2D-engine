import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAnimatorStore,
  getSelectedClip,
  getClipDuration,
  AnimClip,
} from '../store/useAnimatorStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_H = 36;
const HEADER_H = 24;
const LABEL_W = 140;
const MIN_DURATION = 0.01;
const HANDLE_W = 6;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const FRAME_COLORS = [
  '#2a4a7a',
  '#3a5a2a',
  '#6a3a2a',
  '#4a2a6a',
  '#2a5a5a',
  '#5a4a2a',
  '#6a2a4a',
  '#2a6a3a',
];

function frameColor(index: number, selected: boolean): string {
  const base = FRAME_COLORS[index % FRAME_COLORS.length];
  return selected ? '#7ab8f8' : base;
}

// ---------------------------------------------------------------------------
// Ruler — tick marks at every second and sub-second
// ---------------------------------------------------------------------------

function Ruler({ zoom, scrollLeft, width }: { zoom: number; scrollLeft: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = HEADER_H * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, HEADER_H);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, width, HEADER_H);

    // Determine tick interval
    let subInterval = 0.1; // seconds between minor ticks
    if (zoom < 40) subInterval = 0.5;
    if (zoom < 20) subInterval = 1;

    const startTime = scrollLeft / zoom;
    const endTime = startTime + width / zoom;

    ctx.strokeStyle = '#444';
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    let t = Math.floor(startTime / subInterval) * subInterval;
    while (t <= endTime + subInterval) {
      const x = (t - startTime) * zoom;
      const isMajor = Math.abs(t - Math.round(t)) < 0.001;
      ctx.globalAlpha = isMajor ? 1 : 0.4;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_H);
      ctx.lineTo(x, isMajor ? 4 : 14);
      ctx.stroke();
      if (isMajor) {
        ctx.globalAlpha = 0.9;
        ctx.fillText(`${t.toFixed(0)}s`, x, 11);
      }
      t = Math.round((t + subInterval) * 1000) / 1000;
    }
    ctx.globalAlpha = 1;
  }, [zoom, scrollLeft, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width, height: HEADER_H, imageRendering: 'pixelated' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Single clip row
// ---------------------------------------------------------------------------

interface ClipRowProps {
  clip: AnimClip;
  zoom: number;
  selectedFrameIndex: number | null;
  onSelectFrame: (fi: number) => void;
  onResizeFrame: (fi: number, newDuration: number) => void;
  playheadX: number;
}

function ClipRow({
  clip,
  zoom,
  selectedFrameIndex,
  onSelectFrame,
  onResizeFrame,
  playheadX,
}: ClipRowProps) {
  const resizeRef = useRef<{
    frameIndex: number;
    startX: number;
    origDuration: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, fi: number, isHandle: boolean) => {
      e.preventDefault();
      if (isHandle) {
        resizeRef.current = {
          frameIndex: fi,
          startX: e.clientX,
          origDuration: clip.frames[fi].duration,
        };
        const onMove = (me: MouseEvent) => {
          if (!resizeRef.current) return;
          const delta = (me.clientX - resizeRef.current.startX) / zoom;
          const newDur = Math.max(
            MIN_DURATION,
            resizeRef.current.origDuration + delta,
          );
          onResizeFrame(resizeRef.current.frameIndex, newDur);
        };
        const onUp = () => {
          resizeRef.current = null;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      } else {
        onSelectFrame(fi);
      }
    },
    [clip, zoom, onSelectFrame, onResizeFrame],
  );

  let offsetPx = 0;
  return (
    <div style={{ position: 'relative', height: ROW_H, background: '#181828' }}>
      {clip.frames.map((frame, fi) => {
        const widthPx = frame.duration * zoom;
        const left = offsetPx;
        offsetPx += widthPx;
        const selected = fi === selectedFrameIndex;

        return (
          <div
            key={frame.id}
            onMouseDown={(e) => handleMouseDown(e, fi, false)}
            style={{
              position: 'absolute',
              left,
              top: 4,
              width: Math.max(widthPx - 2, 4),
              height: ROW_H - 8,
              background: frameColor(fi, selected),
              border: selected ? '1px solid #b8d8ff' : '1px solid #0004',
              borderRadius: 3,
              cursor: 'pointer',
              userSelect: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Tile ID label */}
            {widthPx > 24 && (
              <span
                style={{
                  position: 'absolute',
                  left: 4,
                  top: 2,
                  fontSize: 9,
                  fontFamily: 'monospace',
                  color: selected ? '#001' : '#ccc',
                  pointerEvents: 'none',
                }}
              >
                {frame.tile_id}
              </span>
            )}
            {/* Duration label */}
            {widthPx > 40 && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 4,
                  fontSize: 8,
                  fontFamily: 'monospace',
                  color: selected ? '#002' : '#aaa',
                  pointerEvents: 'none',
                }}
              >
                {frame.duration.toFixed(2)}s
              </span>
            )}
            {/* Right resize handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, fi, true);
              }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: HANDLE_W,
                height: '100%',
                cursor: 'ew-resize',
                background: selected ? '#4488cc88' : '#ffffff22',
                borderRadius: '0 3px 3px 0',
              }}
            />
          </div>
        );
      })}

      {/* Playhead marker */}
      {playheadX >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: playheadX - 1,
            top: 0,
            width: 2,
            height: ROW_H,
            background: '#f0c040',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export function Timeline() {
  const clips = useAnimatorStore((s) => s.clips);
  const selectedClipId = useAnimatorStore((s) => s.selectedClipId);
  const selectedFrameIndex = useAnimatorStore((s) => s.selectedFrameIndex);
  const playbackState = useAnimatorStore((s) => s.playbackState);
  const currentTime = useAnimatorStore((s) => s.currentTime);
  const zoom = useAnimatorStore((s) => s.timelineZoom);
  const {
    selectClip,
    selectFrame,
    updateFrame,
    setTimelineZoom,
    setCurrentTime,
  } = useAnimatorStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);

  // Observe container width
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width - LABEL_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync scroll
  const handleScroll = useCallback(() => {
    setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
  }, []);

  // Click on ruler to set current time
  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      setCurrentTime(Math.max(0, x / zoom));
    },
    [scrollLeft, zoom, setCurrentTime],
  );

  // Zoom with Ctrl+Wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setTimelineZoom(zoom * (e.deltaY < 0 ? 1.15 : 0.87));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, setTimelineZoom]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;
  const clipDuration = selectedClip ? getClipDuration(selectedClip) : 0;
  const totalWidth = Math.max(containerWidth, clipDuration * zoom + 120);

  const playheadX = currentTime * zoom - scrollLeft;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#131320',
        overflow: 'hidden',
        borderTop: '1px solid #2a2a3a',
      }}
    >
      {/* Zoom controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          background: '#1a1a2a',
          borderBottom: '1px solid #2a2a3a',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
          TIMELINE
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#555' }}>Zoom</span>
        <button
          onClick={() => setTimelineZoom(zoom * 0.75)}
          style={zoomBtnStyle}
        >
          -
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#888', width: 48, textAlign: 'center' }}>
          {Math.round(zoom)}px/s
        </span>
        <button
          onClick={() => setTimelineZoom(zoom * 1.33)}
          style={zoomBtnStyle}
        >
          +
        </button>
        <button
          onClick={() => setTimelineZoom(120)}
          style={{ ...zoomBtnStyle, marginLeft: 4 }}
        >
          Reset
        </button>
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
      >
        <div style={{ display: 'flex', width: LABEL_W + totalWidth, minHeight: '100%' }}>
          {/* Label column */}
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              background: '#1a1a28',
              borderRight: '1px solid #2a2a3a',
              position: 'sticky',
              left: 0,
              zIndex: 20,
            }}
          >
            {/* Ruler corner */}
            <div
              style={{
                height: HEADER_H,
                borderBottom: '1px solid #2a2a3a',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#555' }}>
                Clip
              </span>
            </div>
            {clips.map((clip) => (
              <div
                key={clip.id}
                onClick={() => selectClip(clip.id)}
                style={{
                  height: ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  paddingRight: 4,
                  cursor: 'pointer',
                  borderBottom: '1px solid #22223a',
                  background:
                    clip.id === selectedClipId ? '#1e2a42' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: clip.id === selectedClipId ? '#90b8f8' : '#aaa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {clip.name}
                </span>
                {clip.loop && (
                  <span style={{ fontSize: 9, color: '#5588aa', marginLeft: 2 }}>
                    loop
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Track area */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Ruler */}
            <div
              style={{ height: HEADER_H, position: 'sticky', top: 0, zIndex: 10, cursor: 'pointer' }}
              onClick={handleRulerClick}
            >
              <Ruler zoom={zoom} scrollLeft={scrollLeft} width={totalWidth} />
            </div>

            {/* Clip rows */}
            {clips.map((clip) => (
              <div
                key={clip.id}
                style={{ borderBottom: '1px solid #22223a' }}
                onClick={() => selectClip(clip.id)}
              >
                <ClipRow
                  clip={clip}
                  zoom={zoom}
                  selectedFrameIndex={clip.id === selectedClipId ? selectedFrameIndex : null}
                  onSelectFrame={(fi) => {
                    selectClip(clip.id);
                    selectFrame(fi);
                  }}
                  onResizeFrame={(fi, newDur) => {
                    updateFrame(clip.id, fi, { duration: newDur });
                  }}
                  playheadX={clip.id === selectedClipId ? playheadX : -999}
                />
              </div>
            ))}

            {/* Global playhead line across all rows */}
            {playbackState !== 'stopped' && (
              <div
                style={{
                  position: 'absolute',
                  top: HEADER_H,
                  left: currentTime * zoom,
                  width: 2,
                  height: `calc(100% - ${HEADER_H}px)`,
                  background: '#f0c040',
                  pointerEvents: 'none',
                  zIndex: 15,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: '#222233',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#aaa',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '1px 6px',
  cursor: 'pointer',
};
