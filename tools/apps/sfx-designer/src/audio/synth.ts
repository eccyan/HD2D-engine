/**
 * Procedural audio synthesis engine.
 *
 * Renders SFX to a Float32Array of PCM samples (44100 Hz, mono, [-1..1]).
 * Runs entirely in the main thread (no AudioWorklet needed for short SFX).
 */

import type { OscillatorDef, AdsrEnvelope, FilterDef, ReverbEffect, DelayEffect, DistortionEffect } from '../store/useSfxStore.js';

export const SAMPLE_RATE = 44100;

// ---------------------------------------------------------------------------
// Oscillator rendering
// ---------------------------------------------------------------------------

/**
 * Render a single oscillator to a sample buffer.
 * Applies frequency envelope (linear sweep from freqEnvStart to freqEnvEnd
 * over freqEnvDuration seconds) on top of the base frequency + detune.
 */
function renderOscillator(osc: OscillatorDef, numSamples: number): Float32Array {
  const out = new Float32Array(numSamples);
  const detuneFactor = Math.pow(2, osc.detune / 1200);
  let phase = 0;

  // Pseudo-random state for noise
  let noiseSeed = 0x12345678;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Frequency sweep
    let freq = osc.frequency * detuneFactor;
    if (osc.freqEnvDuration > 0 && t < osc.freqEnvDuration) {
      const alpha = t / osc.freqEnvDuration;
      const startF = osc.freqEnvStart * detuneFactor;
      const endF   = osc.freqEnvEnd   * detuneFactor;
      freq = startF + (endF - startF) * alpha;
    }

    // Phase increment
    const phaseInc = (2 * Math.PI * freq) / SAMPLE_RATE;

    let sample = 0;
    switch (osc.waveform) {
      case 'sine':
        sample = Math.sin(phase);
        break;
      case 'square':
        sample = Math.sin(phase) >= 0 ? 1 : -1;
        break;
      case 'sawtooth':
        // Normalize phase to [-1, 1]
        sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        break;
      case 'triangle': {
        const p = (phase / (2 * Math.PI)) % 1;
        sample = p < 0.5 ? (4 * p - 1) : (3 - 4 * p);
        break;
      }
      case 'noise':
        // xorshift32 white noise
        noiseSeed ^= noiseSeed << 13;
        noiseSeed ^= noiseSeed >> 17;
        noiseSeed ^= noiseSeed << 5;
        sample = (noiseSeed & 0xFFFF) / 32768.0 - 1.0;
        break;
    }

    out[i] = sample * osc.volume;
    phase = (phase + phaseInc) % (2 * Math.PI);
  }

  return out;
}

// ---------------------------------------------------------------------------
// ADSR envelope
// ---------------------------------------------------------------------------

function renderEnvelope(env: AdsrEnvelope, numSamples: number): Float32Array {
  const out = new Float32Array(numSamples);
  const attackSamples  = Math.floor(env.attack  * SAMPLE_RATE);
  const decaySamples   = Math.floor(env.decay   * SAMPLE_RATE);
  const releaseSamples = Math.floor(env.release * SAMPLE_RATE);
  const sustainStart   = attackSamples + decaySamples;
  const sustainEnd     = numSamples - releaseSamples;

  for (let i = 0; i < numSamples; i++) {
    if (i < attackSamples) {
      // Attack: linear ramp up
      out[i] = attackSamples > 0 ? i / attackSamples : 1;
    } else if (i < sustainStart) {
      // Decay: linear ramp from 1 to sustain
      const t = (i - attackSamples) / Math.max(1, decaySamples);
      out[i] = 1 + (env.sustain - 1) * t;
    } else if (i < sustainEnd || sustainEnd <= sustainStart) {
      // Sustain
      out[i] = env.sustain;
    } else {
      // Release: linear ramp from sustain to 0
      const t = (i - sustainEnd) / Math.max(1, releaseSamples);
      out[i] = env.sustain * (1 - t);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Biquad filter (direct form II transposed)
// ---------------------------------------------------------------------------

interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a1: number; a2: number;
}

function computeFilter(type: FilterDef['type'], cutoff: number, q: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoff) / SAMPLE_RATE;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = sinW0 / 2;
      b1 = 0;
      b2 = -sinW0 / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1;
      b1 = -2 * cosW0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
  }

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function applyBiquad(samples: Float32Array, coeffs: BiquadCoeffs): Float32Array {
  const out = new Float32Array(samples.length);
  let z1 = 0, z2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]!;
    const y = coeffs.b0 * x + z1;
    z1 = coeffs.b1 * x - coeffs.a1 * y + z2;
    z2 = coeffs.b2 * x - coeffs.a2 * y;
    out[i] = y;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Distortion
// ---------------------------------------------------------------------------

function applyDistortion(samples: Float32Array, dist: DistortionEffect): Float32Array {
  if (!dist.enabled || dist.bypass) return samples;

  const out = new Float32Array(samples.length);
  const k = dist.amount;

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]!;
    // Soft clipping waveshaper curve
    let distorted: number;
    if (k === 0) {
      distorted = x;
    } else {
      distorted = ((1 + k / 100) * x) / (1 + (k / 100) * Math.abs(x));
    }
    // Wet/dry mix
    out[i] = x * (1 - dist.mix) + distorted * dist.mix;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Delay
// ---------------------------------------------------------------------------

function applyDelay(samples: Float32Array, delay: DelayEffect): Float32Array {
  if (!delay.enabled || delay.bypass) return samples;

  const delaySamples = Math.floor(delay.time * SAMPLE_RATE);
  const out = new Float32Array(samples.length);
  const delayBuf = new Float32Array(delaySamples + samples.length);

  for (let i = 0; i < samples.length; i++) {
    const dry = samples[i]!;
    const delayed = i >= delaySamples ? (delayBuf[i] ?? 0) : 0;
    const wet = delayed;
    // Feed back into delay buffer
    if (i + delaySamples < delayBuf.length) {
      delayBuf[i + delaySamples] = dry + delayed * delay.feedback;
    }
    out[i] = dry * (1 - delay.mix) + wet * delay.mix;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Reverb (simple Schroeder reverb approximation)
// ---------------------------------------------------------------------------

function applyReverb(samples: Float32Array, reverb: ReverbEffect): Float32Array {
  if (!reverb.enabled || reverb.bypass) return samples;

  // Comb filter lengths (prime-ish, scaled by room size)
  const roomScale = 0.5 + reverb.roomSize * 0.5;
  const combDelays = [
    Math.floor(1557 * roomScale),
    Math.floor(1617 * roomScale),
    Math.floor(1491 * roomScale),
    Math.floor(1422 * roomScale),
  ];
  const dampFactor = 1 - reverb.dampening * 0.9;
  const decay = 0.84 * roomScale;

  const out = new Float32Array(samples.length);

  for (const d of combDelays) {
    const combBuf = new Float32Array(Math.max(d, 1));
    let bufIdx = 0;
    let filterz = 0;

    const combOut = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i]!;
      const bufVal = combBuf[bufIdx]!;
      // Lowpass-damped feedback
      filterz = bufVal * (1 - dampFactor) + filterz * dampFactor;
      combBuf[bufIdx] = x + filterz * decay;
      bufIdx = (bufIdx + 1) % d;
      combOut[i] = bufVal;
    }
    // Accumulate comb outputs
    for (let i = 0; i < samples.length; i++) {
      out[i] += combOut[i]!;
    }
  }

  // Normalize comb accumulation
  const combScale = 1 / combDelays.length;
  for (let i = 0; i < samples.length; i++) {
    out[i] *= combScale;
  }

  // Allpass filters for diffusion
  const allpassDelays = [225, 341];
  let current = out;
  for (const d of allpassDelays) {
    const apBuf = new Float32Array(Math.max(d, 1));
    const apOut = new Float32Array(samples.length);
    let apIdx = 0;
    for (let i = 0; i < samples.length; i++) {
      const x = current[i]!;
      const apVal = apBuf[apIdx]!;
      apBuf[apIdx] = x + apVal * 0.5;
      apIdx = (apIdx + 1) % d;
      apOut[i] = apVal - 0.5 * x;
    }
    current = apOut;
  }

  // Wet/dry
  const result = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    result[i] = (samples[i]! ) * (1 - reverb.mix) + (current[i]!) * reverb.mix;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export interface SynthParams {
  oscillators: OscillatorDef[];
  envelope: AdsrEnvelope;
  filters: FilterDef[];
  reverb: ReverbEffect;
  delay: DelayEffect;
  distortion: DistortionEffect;
}

/**
 * Render all oscillators mixed together, apply envelope + effects chain.
 * Returns Float32Array of PCM samples at SAMPLE_RATE Hz, mono, [-1..1].
 */
export function renderSfx(params: SynthParams): Float32Array {
  const numSamples = Math.max(1, Math.floor(params.envelope.duration * SAMPLE_RATE));

  if (params.oscillators.length === 0) {
    return new Float32Array(numSamples);
  }

  // Mix oscillators
  const mixed = new Float32Array(numSamples);
  for (const osc of params.oscillators) {
    const oscSamples = renderOscillator(osc, numSamples);
    for (let i = 0; i < numSamples; i++) {
      mixed[i] += oscSamples[i]!;
    }
  }

  // Normalize mixed oscillators to prevent clipping before envelope
  let maxAmp = 0;
  for (let i = 0; i < numSamples; i++) {
    const v = Math.abs(mixed[i]!);
    if (v > maxAmp) maxAmp = v;
  }
  if (maxAmp > 0) {
    const scale = 1 / maxAmp;
    for (let i = 0; i < numSamples; i++) {
      mixed[i] *= scale;
    }
  }

  // Apply ADSR envelope
  const envCurve = renderEnvelope(params.envelope, numSamples);
  for (let i = 0; i < numSamples; i++) {
    mixed[i] *= envCurve[i]!;
  }

  // Apply filter chain
  let filtered = mixed;
  for (const filt of params.filters) {
    const coeffs = computeFilter(filt.type, filt.cutoff, filt.q);
    filtered = applyBiquad(filtered, coeffs);
  }

  // Effects chain: distortion → delay → reverb
  let effected = applyDistortion(filtered, params.distortion);
  effected = applyDelay(effected, params.delay);
  effected = applyReverb(effected, params.reverb);

  // Final limiter / normalize to peak -0.1 dBFS
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const v = Math.abs(effected[i]!);
    if (v > peak) peak = v;
  }
  if (peak > 0.891) {
    const limitScale = 0.891 / peak;
    for (let i = 0; i < numSamples; i++) {
      effected[i] *= limitScale;
    }
  }

  return effected;
}

// ---------------------------------------------------------------------------
// WAV export
// ---------------------------------------------------------------------------

/**
 * Encode Float32Array PCM samples to a 44100Hz 16-bit mono WAV ArrayBuffer.
 */
export function encodeWav(samples: Float32Array): ArrayBuffer {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);         // chunk size
  view.setUint16(20, 1, true);          // PCM format
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true);          // block align
  view.setUint16(34, 16, true);         // bits per sample

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples: float32 → int16
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }

  return buffer;
}
