import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayerId = 'bass' | 'harmony' | 'melody' | 'percussion';
export type MusicStateId = 'Explore' | 'NearNPC' | 'Dialog';

export interface LayerState {
  id: LayerId;
  label: string;
  volume: number;       // 0–1
  muted: boolean;
  soloed: boolean;
  audioBuffer: AudioBuffer | null;
  color: string;
}

export interface MusicStatePreset {
  id: MusicStateId;
  label: string;
  volumes: Record<LayerId, number>;
}

export interface LoopRegion {
  startSec: number;
  endSec: number;
}

export interface ComposerStore {
  // Transport
  isPlaying: boolean;
  playheadSec: number;
  bpm: number;
  masterVolume: number;
  loopEnabled: boolean;
  loopRegion: LoopRegion;

  // Layers
  layers: LayerState[];

  // Music state presets
  musicStates: MusicStatePreset[];
  activeMusicState: MusicStateId | null;
  crossfadeRate: number; // 1–10

  // Engine connection
  engineUrl: string;
  engineConnected: boolean;

  // AI panel
  aiPanelOpen: boolean;

  // Actions
  setPlaying: (v: boolean) => void;
  setPlayheadSec: (v: number) => void;
  setBpm: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setLoopEnabled: (v: boolean) => void;
  setLoopRegion: (r: LoopRegion) => void;

  setLayerVolume: (id: LayerId, v: number) => void;
  setLayerMuted: (id: LayerId, v: boolean) => void;
  setLayerSoloed: (id: LayerId, v: boolean) => void;
  setLayerBuffer: (id: LayerId, buf: AudioBuffer | null) => void;

  setMusicStateVolume: (stateId: MusicStateId, layerId: LayerId, v: number) => void;
  setActiveMusicState: (id: MusicStateId | null) => void;
  setCrossfadeRate: (v: number) => void;

  setEngineUrl: (url: string) => void;
  setEngineConnected: (v: boolean) => void;
  setAiPanelOpen: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Default preset values matching game AudioSystem
// ---------------------------------------------------------------------------
const DEFAULT_MUSIC_STATES: MusicStatePreset[] = [
  {
    id: 'Explore',
    label: 'Explore',
    volumes: { bass: 0.8, harmony: 0.5, melody: 0.0, percussion: 0.0 },
  },
  {
    id: 'NearNPC',
    label: 'Near NPC',
    volumes: { bass: 0.8, harmony: 0.2, melody: 0.7, percussion: 0.0 },
  },
  {
    id: 'Dialog',
    label: 'Dialog',
    volumes: { bass: 0.4, harmony: 0.0, melody: 0.0, percussion: 0.0 },
  },
];

const DEFAULT_LAYERS: LayerState[] = [
  { id: 'bass',       label: 'Bass Drone',   volume: 0.8, muted: false, soloed: false, audioBuffer: null, color: '#4a6aff' },
  { id: 'harmony',    label: 'Harmony Pad',  volume: 0.5, muted: false, soloed: false, audioBuffer: null, color: '#a040e0' },
  { id: 'melody',     label: 'Melody',       volume: 0.0, muted: false, soloed: false, audioBuffer: null, color: '#40b870' },
  { id: 'percussion', label: 'Percussion',   volume: 0.0, muted: false, soloed: false, audioBuffer: null, color: '#e07040' },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useComposerStore = create<ComposerStore>((set) => ({
  isPlaying: false,
  playheadSec: 0,
  bpm: 120,
  masterVolume: 0.8,
  loopEnabled: true,
  loopRegion: { startSec: 0, endSec: 8 },

  layers: DEFAULT_LAYERS,

  musicStates: DEFAULT_MUSIC_STATES,
  activeMusicState: null,
  crossfadeRate: 3,

  engineUrl: 'http://localhost:8080',
  engineConnected: false,

  aiPanelOpen: false,

  setPlaying: (v) => set({ isPlaying: v }),
  setPlayheadSec: (v) => set({ playheadSec: v }),
  setBpm: (v) => set({ bpm: v }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setLoopEnabled: (v) => set({ loopEnabled: v }),
  setLoopRegion: (r) => set({ loopRegion: r }),

  setLayerVolume: (id, v) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, volume: v } : l)),
    })),

  setLayerMuted: (id, v) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, muted: v } : l)),
    })),

  setLayerSoloed: (id, v) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, soloed: v } : l)),
    })),

  setLayerBuffer: (id, buf) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, audioBuffer: buf } : l)),
    })),

  setMusicStateVolume: (stateId, layerId, v) =>
    set((s) => ({
      musicStates: s.musicStates.map((ms) =>
        ms.id === stateId
          ? { ...ms, volumes: { ...ms.volumes, [layerId]: v } }
          : ms,
      ),
    })),

  setActiveMusicState: (id) => set({ activeMusicState: id }),
  setCrossfadeRate: (v) => set({ crossfadeRate: v }),

  setEngineUrl: (url) => set({ engineUrl: url }),
  setEngineConnected: (v) => set({ engineConnected: v }),
  setAiPanelOpen: (v) => set({ aiPanelOpen: v }),
}));
