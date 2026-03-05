import React, { useRef, useEffect, useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  playheadSec: number;
  loopStart: number;
  loopEnd: number;
  duration: number;
  color: string;
  onLoopChange?: (start: number, end: number) => void;
  onSeek?: (sec: number) => void;
}

// ---------------------------------------------------------------------------
// WaveformDisplay
// ---------------------------------------------------------------------------
export function WaveformDisplay({
  audioBuffer,
  playheadSec,
  loopStart,
  loopEnd,
  duration,
  color,
  onLoopChange,
  onSeek,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffsetSec, setScrollOffsetSec] = useState(0);
  const dragRef = useRef<{ type: 'seek' | 'loop-start' | 'loop-end' | 'loop-move'; startX: number; startSec: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    const viewDuration = duration / zoom;
    const secToX = (sec: number) => ((sec - scrollOffsetSec) / viewDuration) * W;

    // Loop region highlight
    const lx0 = secToX(loopStart);
    const lx1 = secToX(loopEnd);
    ctx.fillStyle = `${color}22`;
    ctx.fillRect(lx0, 0, lx1 - lx0, H);
    // Loop boundaries
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx0, 0);
    ctx.lineTo(lx0, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx1, 0);
    ctx.lineTo(lx1, H);
    ctx.stroke();

    // Waveform
    if (audioBuffer) {
      const data = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const totalDur = audioBuffer.duration;

      const startSample = Math.floor(scrollOffsetSec * sampleRate);
      const endSample = Math.min(data.length, Math.floor((scrollOffsetSec + viewDuration) * sampleRate));
      const samplesInView = endSample - startSample;
      const pixelsPerSample = W / samplesInView;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(samplesInView / W));
      const mid = H / 2;

      for (let px = 0; px < W; px++) {
        const si = startSample + Math.floor(px / pixelsPerSample);
        const siEnd = Math.min(data.length - 1, si + step);
        let min = 0, max = 0;
        for (let i = si; i <= siEnd; i++) {
          const v = data[i] ?? 0;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const y0 = mid - max * mid * 0.9;
        const y1 = mid - min * mid * 0.9;
        if (px === 0) ctx.moveTo(px, y0);
        ctx.lineTo(px, y0);
        ctx.lineTo(px, y1);
      }
      ctx.stroke();

      // Duration indicator
      const endX = secToX(totalDur);
      if (endX > 0 && endX < W) {
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, H);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      // Empty state
      ctx.fillStyle = '#333';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Drop WAV file or use AI Generate', W / 2, H / 2 - 6);
      ctx.fillStyle = '#222';
      ctx.fillText('44100 Hz · 16-bit PCM mono', W / 2, H / 2 + 10);
    }

    // Time axis
    const tickInterval = pickTickInterval(viewDuration, W);
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    const firstTick = Math.ceil(scrollOffsetSec / tickInterval) * tickInterval;
    for (let t = firstTick; t <= scrollOffsetSec + viewDuration; t += tickInterval) {
      const x = secToX(t);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, H - 14);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.fillText(formatTime(t), x + 2, H - 3);
    }

    // Playhead
    const phX = secToX(playheadSec);
    if (phX >= 0 && phX <= W) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, H - 14);
      ctx.stroke();
      // Triangle head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(phX - 5, 0);
      ctx.lineTo(phX + 5, 0);
      ctx.lineTo(phX, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Loop handle indicators
    ctx.fillStyle = color;
    ctx.fillRect(lx0 - 3, 0, 6, 12);
    ctx.fillRect(lx1 - 3, 0, 6, 12);

  }, [audioBuffer, playheadSec, loopStart, loopEnd, duration, color, zoom, scrollOffsetSec]);

  useEffect(() => {
    draw();
  }, [draw]);

  // -------------------------------------------------------------------------
  // Resize observer
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // -------------------------------------------------------------------------
  // Mouse interactions
  // -------------------------------------------------------------------------
  const xToSec = useCallback((x: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const W = canvas.width;
    const viewDuration = duration / zoom;
    return scrollOffsetSec + (x / W) * viewDuration;
  }, [duration, zoom, scrollOffsetSec]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = xToSec(x);

    const W = canvas.width;
    const viewDuration = duration / zoom;
    const lx0 = ((loopStart - scrollOffsetSec) / viewDuration) * W;
    const lx1 = ((loopEnd - scrollOffsetSec) / viewDuration) * W;

    // Check if near loop handles (within 6px)
    if (Math.abs(x - lx0) < 6) {
      dragRef.current = { type: 'loop-start', startX: x, startSec: sec };
    } else if (Math.abs(x - lx1) < 6) {
      dragRef.current = { type: 'loop-end', startX: x, startSec: sec };
    } else if (x > lx0 + 6 && x < lx1 - 6 && e.altKey) {
      dragRef.current = { type: 'loop-move', startX: x, startSec: sec };
    } else {
      dragRef.current = { type: 'seek', startX: x, startSec: sec };
      onSeek?.(Math.max(0, Math.min(duration, sec)));
    }
  }, [xToSec, loopStart, loopEnd, duration, zoom, scrollOffsetSec, onSeek]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !dragRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = xToSec(x);
    const clampedSec = Math.max(0, Math.min(duration, sec));

    if (dragRef.current.type === 'seek') {
      onSeek?.(clampedSec);
    } else if (dragRef.current.type === 'loop-start') {
      const newStart = Math.min(clampedSec, loopEnd - 0.1);
      onLoopChange?.(newStart, loopEnd);
    } else if (dragRef.current.type === 'loop-end') {
      const newEnd = Math.max(clampedSec, loopStart + 0.1);
      onLoopChange?.(loopStart, newEnd);
    } else if (dragRef.current.type === 'loop-move') {
      const delta = sec - dragRef.current.startSec;
      const span = loopEnd - loopStart;
      const newStart = Math.max(0, Math.min(duration - span, loopStart + delta));
      onLoopChange?.(newStart, newStart + span);
      dragRef.current.startSec = sec;
    }
  }, [xToSec, duration, loopStart, loopEnd, onSeek, onLoopChange]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const newZoom = Math.max(1, Math.min(32, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      setZoom(newZoom);
    } else {
      // Scroll
      const viewDuration = duration / zoom;
      const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * (viewDuration / 500);
      setScrollOffsetSec((prev) => Math.max(0, Math.min(duration - viewDuration, prev + delta)));
    }
  }, [zoom, duration]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Zoom indicator */}
      {zoom > 1 && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 6,
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#666',
          pointerEvents: 'none',
        }}>
          {zoom.toFixed(1)}x
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pickTickInterval(viewDuration: number, pixelWidth: number): number {
  const minPixelsBetweenTicks = 60;
  const maxTicks = pixelWidth / minPixelsBetweenTicks;
  const rawInterval = viewDuration / maxTicks;
  const niceLevels = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];
  for (const lvl of niceLevels) {
    if (lvl >= rawInterval) return lvl;
  }
  return 120;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return m > 0 ? `${m}:${s}` : `${s}s`;
}
