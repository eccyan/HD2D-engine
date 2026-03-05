import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface OscillatorDef {
  id: string;
  waveform: WaveformType;
  frequency: number;   // Hz, 20–20000
  detune: number;      // cents, -100 to +100
  volume: number;      // 0–1
  freqEnvStart: number; // Hz
  freqEnvEnd: number;   // Hz
  freqEnvDuration: number; // seconds, 0 = no sweep
}

export interface AdsrEnvelope {
  attack: number;   // 0–2s
  decay: number;    // 0–2s
  sustain: number;  // 0–1
  release: number;  // 0–2s
  duration: number; // total 0.01–5s
}

export interface FilterDef {
  id: string;
  type: FilterType;
  cutoff: number;    // 20–20000 Hz
  q: number;         // 0.1–20
}

export interface ReverbEffect {
  enabled: boolean;
  bypass: boolean;
  roomSize: number;   // 0–1
  dampening: number;  // 0–1
  mix: number;        // 0–1
}

export interface DelayEffect {
  enabled: boolean;
  bypass: boolean;
  time: number;       // 0–1s
  feedback: number;   // 0–0.95
  mix: number;        // 0–1
}

export interface DistortionEffect {
  enabled: boolean;
  bypass: boolean;
  amount: number;     // 0–400
  oversample: '2x' | '4x' | 'none';
  mix: number;        // 0–1
}

export interface SfxState {
  oscillators: OscillatorDef[];
  envelope: AdsrEnvelope;
  filters: FilterDef[];
  reverb: ReverbEffect;
  delay: DelayEffect;
  distortion: DistortionEffect;

  // Generated audio buffer (PCM float32 samples, 44100 Hz mono)
  generatedSamples: Float32Array | null;
  aiGeneratedBuffer: ArrayBuffer | null;
  isPlaying: boolean;
  engineConnected: boolean;
  engineUrl: string;

  // Actions
  addOscillator: () => void;
  removeOscillator: (id: string) => void;
  updateOscillator: (id: string, patch: Partial<OscillatorDef>) => void;
  addHarmonic: (id: string) => void;
  setEnvelope: (patch: Partial<AdsrEnvelope>) => void;
  addFilter: () => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, patch: Partial<FilterDef>) => void;
  setReverb: (patch: Partial<ReverbEffect>) => void;
  setDelay: (patch: Partial<DelayEffect>) => void;
  setDistortion: (patch: Partial<DistortionEffect>) => void;
  setGeneratedSamples: (s: Float32Array | null) => void;
  setAiGeneratedBuffer: (b: ArrayBuffer | null) => void;
  setIsPlaying: (v: boolean) => void;
  setEngineConnected: (v: boolean) => void;
  setEngineUrl: (url: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function defaultOscillator(overrides?: Partial<OscillatorDef>): OscillatorDef {
  return {
    id: makeId(),
    waveform: 'sine',
    frequency: 440,
    detune: 0,
    volume: 0.8,
    freqEnvStart: 440,
    freqEnvEnd: 440,
    freqEnvDuration: 0,
    ...overrides,
  };
}

function defaultFilter(): FilterDef {
  return {
    id: makeId(),
    type: 'lowpass',
    cutoff: 8000,
    q: 1,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSfxStore = create<SfxState>((set, get) => ({
  oscillators: [defaultOscillator()],

  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 0.3,
    duration: 1.0,
  },

  filters: [],

  reverb: {
    enabled: false,
    bypass: false,
    roomSize: 0.5,
    dampening: 0.5,
    mix: 0.3,
  },

  delay: {
    enabled: false,
    bypass: false,
    time: 0.25,
    feedback: 0.4,
    mix: 0.3,
  },

  distortion: {
    enabled: false,
    bypass: false,
    amount: 50,
    oversample: '2x',
    mix: 0.5,
  },

  generatedSamples: null,
  aiGeneratedBuffer: null,
  isPlaying: false,
  engineConnected: false,
  engineUrl: 'ws://localhost:9001',

  addOscillator: () =>
    set((s) => ({ oscillators: [...s.oscillators, defaultOscillator()] })),

  removeOscillator: (id) =>
    set((s) => ({ oscillators: s.oscillators.filter((o) => o.id !== id) })),

  updateOscillator: (id, patch) =>
    set((s) => ({
      oscillators: s.oscillators.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  addHarmonic: (id) => {
    const osc = get().oscillators.find((o) => o.id === id);
    if (!osc) return;
    const harmonic = defaultOscillator({
      waveform: osc.waveform,
      frequency: Math.min(osc.frequency * 2, 20000),
      detune: osc.detune,
      volume: osc.volume * 0.5,
      freqEnvStart: Math.min(osc.freqEnvStart * 2, 20000),
      freqEnvEnd: Math.min(osc.freqEnvEnd * 2, 20000),
      freqEnvDuration: osc.freqEnvDuration,
    });
    set((s) => ({ oscillators: [...s.oscillators, harmonic] }));
  },

  setEnvelope: (patch) =>
    set((s) => ({ envelope: { ...s.envelope, ...patch } })),

  addFilter: () =>
    set((s) => ({ filters: [...s.filters, defaultFilter()] })),

  removeFilter: (id) =>
    set((s) => ({ filters: s.filters.filter((f) => f.id !== id) })),

  updateFilter: (id, patch) =>
    set((s) => ({
      filters: s.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  setReverb: (patch) =>
    set((s) => ({ reverb: { ...s.reverb, ...patch } })),

  setDelay: (patch) =>
    set((s) => ({ delay: { ...s.delay, ...patch } })),

  setDistortion: (patch) =>
    set((s) => ({ distortion: { ...s.distortion, ...patch } })),

  setGeneratedSamples: (s) => set({ generatedSamples: s }),
  setAiGeneratedBuffer: (b) => set({ aiGeneratedBuffer: b }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setEngineConnected: (v) => set({ engineConnected: v }),
  setEngineUrl: (url) => set({ engineUrl: url }),
}));
