# Audio Composer

4-layer interactive music editor for authoring the engine's `AudioSystem` music layers and `MusicState` presets. Produces WAV files and state configuration consumed directly by the game.

## Layout

```
+----------------------------------------------------------------+
|  File  Edit  Transport         [Play] [Stop]  BPM: [120]       |
+----------------------------------------------------------------+
|  t=0s          t=2s            t=4s            t=8s            |
+--- Bass Drone ------------------------------------------------- |
|  [==waveform==========================]  Vol: [====|--] 0.80   |
+--- Harmony Pad ------------------------------------------------ |
|  [==waveform===============]            Vol: [==|----] 0.50   |
+--- Melody ----------------------------------------------------- |
|  [==waveform=========]                  Vol: [=======] 0.00   |
+--- Percussion ------------------------------------------------- |
|  [==waveform=================]          Vol: [===|---] 0.00   |
+----------------------------------------------------------------+
|  MusicState Presets    |  Crossfade         |  Layer Controls  |
|  [Explore]             |  Rate: [3.0]       |  [Import WAV]    |
|  [NearNPC ]            |  (exp. decay)      |  [Export WAV]    |
|  [Dialog  ]            |                    |  [AI Generate]   |
+----------------------------------------------------------------+
```

## Features

### 4-Lane Timeline

Each lane represents one music layer. The timeline shows the waveform of the loaded WAV file for that layer. All 4 layers loop simultaneously in the engine — the timeline reflects their individual lengths.

Scrub by clicking anywhere on the timeline. All lanes play in sync.

### Waveform Visualization

WAV data is decoded client-side via the Web Audio API and rendered as a peak-normalized waveform. The playback cursor moves in real time during preview.

### MusicState Preset Editor

Three presets map to the engine's `MusicState` enum. Each preset specifies a target volume (0.0-1.0) for each of the 4 layers.

| State | Bass Drone | Harmony Pad | Melody | Percussion |
|---|---|---|---|---|
| Explore | 0.8 | 0.5 | 0.0 | 0.0 |
| NearNPC | 0.8 | 0.2 | 0.7 | 0.0 |
| Dialog | 0.4 | 0.0 | 0.0 | 0.0 |

Click any preset row to load its values into the lane volume sliders. Editing a slider updates the preset table. Changes are saved to the exported JSON.

### Crossfade Control

The crossfade rate field controls the exponential decay coefficient used by the engine:

```
current += (target - current) * (1 - exp(-rate * dt))
```

A rate of 3.0 reaches ~90% of the target volume in 0.75 seconds. Higher values are snappier; lower values are smoother.

### Web Audio Playback

Preview uses the browser's Web Audio API — no engine connection required. Each layer is an `AudioBufferSourceNode` looped independently. The volume sliders map directly to `GainNode` values, giving an accurate preview of how the engine will mix the layers.

### WAV Import and Export

Each lane has an independent Import button. Accepted formats: WAV 44100 Hz 16-bit mono (the engine's native format). Other formats are automatically converted in the browser before saving.

Clicking "Export All" writes all 4 WAV files to `assets/audio/` via the bridge REST API:

```
music_bass.wav
music_harmony.wav
music_melody.wav
music_percussion.wav
```

State preset configuration is exported as `assets/audio/music_config.json` which the engine's `AudioSystem::init()` reads on startup.

### Procedural Loop Generation

The "Procedural Generation" panel generates music loops entirely in the browser using Web Audio's `OfflineAudioContext`. No server or external AI model is required.

1. Select a **target layer** (Bass, Harmony, Melody, or Percussion)
2. Pick a **style preset** from the list
3. Set **duration** (1–16 seconds) — the BPM is read from the transport
4. Click **Generate Loop**, then **Preview** and **Apply**

Each layer type has 4 style presets:

| Layer | Styles |
|---|---|
| **Bass** | Ambient Drone (sine + LFO), Pulse Bass (8th-note gated), Dark Rumble (triangle + noise), Walking Bass (note sequence) |
| **Harmony** | Ethereal Pad (major triad, detuned), Dark Minor (minor triad, tremolo), Fifth Drone (open fifth), Mystery (sus4 chord) |
| **Melody** | Pentatonic Flow (random walk), Arpeggiated (up/down pattern), Fantasy Motif (fixed phrase), Sparse Bells (irregular notes) |
| **Percussion** | Subtle Pulse (kick + hi-hat), Tribal (kick + tom + shaker), Minimal (kick only), March (kick-snare) |

Generated loops are rendered as 44100 Hz mono WAV and can be applied directly to any lane.

### AI Generation (Optional — Stable Audio)

For local AI music generation, you can run the Stable Audio server. This is recommended for studios with local GPU hardware:

1. Install dependencies: `pip install flask stable-audio-tools`
2. Start the server: `python tools/scripts/stable-audio-server.py`
3. Set `VITE_STABLE_AUDIO_URL=http://localhost:8001` in `tools/.env`

The server wraps `stable-audio-open-small` (up to 11 seconds, 44.1 kHz stereo). A CUDA GPU is recommended.

### AI Generation (Optional — Replicate)

For cloud-based AI music generation, you can optionally use the Replicate API. Set `VITE_REPLICATE_API_TOKEN` in `tools/.env` with your API token from [replicate.com](https://replicate.com/account/api-tokens). This is not required — the built-in procedural generation covers the engine's 4-layer music system.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `S` | Stop and return to start |
| `Ctrl+S` | Save and export |
| `1` / `2` / `3` | Preview Explore / NearNPC / Dialog preset volumes |
