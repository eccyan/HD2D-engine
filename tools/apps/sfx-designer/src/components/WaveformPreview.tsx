import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSfxStore } from '../store/useSfxStore.js';
import { renderSfx, encodeWav, SAMPLE_RATE } from '../audio/synth.js';

// ---------------------------------------------------------------------------
// Canvas dimensions
// ---------------------------------------------------------------------------

const CANVAS_W = 600;
const CANVAS_H = 160;

type ViewMode = 'waveform' | 'spectrogram';

// ---------------------------------------------------------------------------
// Waveform drawing
// ---------------------------------------------------------------------------

function drawWaveform(ctx: CanvasRenderingContext2D, samples: Float32Array) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background
  ctx.fillStyle = '#0e0e1a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Center line
  ctx.strokeStyle = '#1e1e3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H / 2);
  ctx.lineTo(CANVAS_W, CANVAS_H / 2);
  ctx.stroke();

  if (samples.length === 0) return;

  // Waveform fill
  const samplesPerPixel = samples.length / CANVAS_W;

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, 'rgba(80, 160, 220, 0.8)');
  grad.addColorStop(0.5, 'rgba(100, 200, 255, 1)');
  grad.addColorStop(1, 'rgba(80, 160, 220, 0.8)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  for (let px = 0; px < CANVAS_W; px++) {
    const startIdx = Math.floor(px * samplesPerPixel);
    const endIdx   = Math.floor((px + 1) * samplesPerPixel);

    let min = 1, max = -1;
    for (let i = startIdx; i < endIdx && i < samples.length; i++) {
      const s = samples[i]!;
      if (s < min) min = s;
      if (s > max) max = s;
    }

    const yMin = ((1 - max) / 2) * CANVAS_H;
    const yMax = ((1 - min) / 2) * CANVAS_H;

    if (px === 0) ctx.moveTo(px, (yMin + yMax) / 2);
    else {
      ctx.moveTo(px, yMin);
      ctx.lineTo(px, yMax);
    }
  }
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Spectrogram drawing (FFT-based)
// ---------------------------------------------------------------------------

function drawSpectrogram(ctx: CanvasRenderingContext2D, samples: Float32Array) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0e0e1a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (samples.length === 0) return;

  const fftSize = 512;
  const hopSize = Math.max(1, Math.floor(samples.length / CANVAS_W));
  const halfFFT = fftSize / 2;

  // Build simple DFT magnitude columns (FFT via Cooley-Tukey)
  const fftReal = new Float32Array(fftSize);
  const fftImag = new Float32Array(fftSize);

  for (let col = 0; col < CANVAS_W; col++) {
    const offset = col * hopSize;

    // Fill FFT input with windowed samples
    for (let i = 0; i < fftSize; i++) {
      const idx = offset + i;
      const sample = idx < samples.length ? samples[idx]! : 0;
      // Hann window
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
      fftReal[i] = sample * w;
      fftImag[i] = 0;
    }

    // Iterative Cooley-Tukey FFT
    let n = fftSize;
    let half = 1;
    while (half < n) {
      for (let k = 0; k < n; k += half * 2) {
        for (let j = 0; j < half; j++) {
          const angle = -Math.PI * j / half;
          const wr = Math.cos(angle);
          const wi = Math.sin(angle);
          const ar = fftReal[k + j]!;
          const ai = fftImag[k + j]!;
          const br = fftReal[k + j + half]!;
          const bi = fftImag[k + j + half]!;
          const cr = br * wr - bi * wi;
          const ci = br * wi + bi * wr;
          fftReal[k + j] = ar + cr;
          fftImag[k + j] = ai + ci;
          fftReal[k + j + half] = ar - cr;
          fftImag[k + j + half] = ai - ci;
        }
      }
      half *= 2;
    }

    // Draw magnitude column
    for (let bin = 0; bin < halfFFT; bin++) {
      const re = fftReal[bin]!;
      const im = fftImag[bin]!;
      const mag = Math.sqrt(re * re + im * im) / fftSize;
      const db  = Math.max(-80, 20 * Math.log10(mag + 1e-9));
      const norm = (db + 80) / 80; // 0..1

      // Map bin to y (log scale, high freq at bottom)
      const y = CANVAS_H - Math.round((bin / halfFFT) * CANVAS_H);

      // Color: black → blue → cyan → white
      const r = Math.round(Math.max(0, (norm - 0.6) * 2.5) * 255);
      const g = Math.round(Math.max(0, (norm - 0.3) * 1.4) * 255);
      const b = Math.round(Math.min(1, norm * 1.5) * 255);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col, y - 1, 1, 2);
    }
  }

  // Frequency labels (log scale)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  const freqLabels: [number, string][] = [
    [100, '100Hz'], [500, '500Hz'], [1000, '1kHz'], [5000, '5kHz'], [10000, '10kHz'],
  ];
  for (const [freq, label] of freqLabels) {
    const bin = Math.round((freq / (SAMPLE_RATE / 2)) * halfFFT);
    const y = CANVAS_H - (bin / halfFFT) * CANVAS_H;
    if (y > 0 && y < CANVAS_H) {
      ctx.fillText(label, CANVAS_W - 2, y + 3);
    }
  }
}

// ---------------------------------------------------------------------------
// Active audio source ref (for stopping playback)
// ---------------------------------------------------------------------------

let activeSource: AudioBufferSourceNode | null = null;

// ---------------------------------------------------------------------------
// WaveformPreview
// ---------------------------------------------------------------------------

export function WaveformPreview() {
  const store = useSfxStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('waveform');
  const [isGenerating, setIsGenerating] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Draw canvas whenever samples or view mode change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const samples = store.generatedSamples;
    if (!samples || samples.length === 0) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#0e0e1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#2a2a4a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click Render to generate waveform', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    if (viewMode === 'waveform') {
      drawWaveform(ctx, samples);
    } else {
      drawSpectrogram(ctx, samples);
    }
  }, [store.generatedSamples, viewMode]);

  const handleRender = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // Run synthesis (may take a moment for long SFX)
      await new Promise<void>((resolve) => setTimeout(resolve, 0)); // yield to React
      const samples = renderSfx({
        oscillators: store.oscillators,
        envelope: store.envelope,
        filters: store.filters,
        reverb: store.reverb,
        delay: store.delay,
        distortion: store.distortion,
      });
      store.setGeneratedSamples(samples);
      setDuration(samples.length / SAMPLE_RATE);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [store]);

  const handlePlay = useCallback(async () => {
    const samples = store.generatedSamples;
    if (!samples) return;

    // Stop any playing source
    if (activeSource) {
      try { activeSource.stop(); } catch { /* ok */ }
      activeSource = null;
    }

    try {
      const audioCtx = new AudioContext();
      const buffer = audioCtx.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
      activeSource = source;
      store.setIsPlaying(true);
      source.onended = () => {
        store.setIsPlaying(false);
        activeSource = null;
      };
    } catch (e) {
      setError(`Playback failed: ${e instanceof Error ? e.message : e}`);
    }
  }, [store]);

  const handleStop = useCallback(() => {
    if (activeSource) {
      try { activeSource.stop(); } catch { /* ok */ }
      activeSource = null;
    }
    store.setIsPlaying(false);
  }, [store]);

  const handlePlayAi = useCallback(async () => {
    const buf = store.aiGeneratedBuffer;
    if (!buf) return;

    if (activeSource) {
      try { activeSource.stop(); } catch { /* ok */ }
      activeSource = null;
    }

    try {
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(buf.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(audioCtx.destination);
      source.start();
      activeSource = source;
    } catch (e) {
      setError(`AI playback failed: ${e instanceof Error ? e.message : e}`);
    }
  }, [store.aiGeneratedBuffer]);

  const handleExport = useCallback(() => {
    const samples = store.generatedSamples;
    if (!samples) return;
    const wav = encodeWav(samples);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sfx_export.wav';
    a.click();
    URL.revokeObjectURL(url);
  }, [store.generatedSamples]);

  const hasSamples = !!store.generatedSamples;

  return (
    <div style={styles.panel}>
      {/* Canvas */}
      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Controls bar */}
      <div style={styles.controls}>
        {/* View mode */}
        <div style={styles.viewToggle}>
          {(['waveform', 'spectrogram'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                ...styles.modeBtn,
                background: viewMode === m ? '#2a3a5a' : '#1a1a2a',
                border: viewMode === m ? '1px solid #4a6ab0' : '1px solid #2a2a3a',
                color: viewMode === m ? '#80a0e0' : '#505070',
              }}
            >
              {m === 'waveform' ? 'Wave' : 'Spec'}
            </button>
          ))}
        </div>

        {/* Duration display */}
        <span style={styles.duration}>
          {hasSamples ? `${duration.toFixed(3)}s` : '--'}
        </span>

        {/* Action buttons */}
        <button
          onClick={handleRender}
          disabled={isGenerating}
          style={{
            ...styles.btn,
            background: '#1a2a3a',
            border: '1px solid #3a6a9a',
            color: '#60b0e0',
          }}
          title="Render waveform from current settings"
        >
          {isGenerating ? '...' : 'RENDER'}
        </button>

        <button
          onClick={store.isPlaying ? handleStop : handlePlay}
          disabled={!hasSamples}
          style={{
            ...styles.btn,
            background: store.isPlaying ? '#2a1a1a' : '#1a2a1a',
            border: store.isPlaying ? '1px solid #9a4a4a' : '1px solid #4a8a4a',
            color: store.isPlaying ? '#e06060' : '#60c060',
            opacity: !hasSamples ? 0.4 : 1,
          }}
          title={store.isPlaying ? 'Stop playback' : 'Play rendered SFX'}
        >
          {store.isPlaying ? 'STOP' : 'PLAY'}
        </button>

        <button
          onClick={handleExport}
          disabled={!hasSamples}
          style={{
            ...styles.btn,
            background: '#2a2a1a',
            border: '1px solid #8a7a2a',
            color: '#c0a040',
            opacity: !hasSamples ? 0.4 : 1,
          }}
          title="Export as 44100Hz 16-bit WAV"
        >
          WAV
        </button>

        {store.aiGeneratedBuffer && (
          <button
            onClick={handlePlayAi}
            style={{
              ...styles.btn,
              background: '#1a1a2a',
              border: '1px solid #5a4ab0',
              color: '#9080e0',
            }}
            title="Play AI-generated audio"
          >
            AI PLAY
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>{error}</div>
      )}
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
  canvasWrap: {
    height: CANVAS_H,
    flexShrink: 0,
    overflow: 'hidden',
    borderBottom: '1px solid #2a2a3a',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    flexShrink: 0,
  },
  viewToggle: {
    display: 'flex',
    gap: 3,
  },
  modeBtn: {
    borderRadius: 3,
    padding: '3px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
  },
  duration: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#505070',
    minWidth: 54,
  },
  btn: {
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#e06060',
    padding: '4px 10px',
    background: '#1a0a0a',
    borderTop: '1px solid #3a1a1a',
  },
};
