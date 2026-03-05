# SFX Designer

Sound effect authoring tool with procedural synthesis, waveform editing, and AI generation. Outputs 44100 Hz 16-bit mono WAV files compatible with the engine's `AudioSystem`.

## Layout

```
+---------------------------------------------------------------+
|  [Preset v]  [New] [Delete]  [Play] [Stop]  [Export WAV]     |
+-------------------------------+-------------------------------+
|                               |                               |
|  Synthesis Chain              |  Waveform View                |
|  -------------------------    |  (time domain)                |
|  [Oscillator 1]               |  ~~~^~~~~^~~~                 |
|    Type: [Sine   v]           |                               |
|    Freq: [440 Hz    ]         |  Spectrogram View             |
|    Amp:  [0.8       ]         |  (frequency domain)           |
|                               |  [color gradient]             |
|  [ADSR Envelope]              |                               |
|    A: [0.01s] D: [0.05s]      |  Duration: 0.42 s             |
|    S: [0.3  ] R: [0.15s]      |  Peak: -3.2 dBFS              |
|                               |                               |
|  [Filter]                     +-------------------------------+
|    Type: [Low Pass v]         |  Effects Chain                |
|    Freq: [2000 Hz  ]          |  -------------------------    |
|    Q:    [1.2      ]          |  [Reverb]  Wet: 0.15          |
|                               |  [Delay ]  Time: 0.08s        |
|  [+ Add Oscillator]           |  [Distort] Drive: 0.0         |
|  [+ Add Noise]                |                               |
+-------------------------------+-------------------------------+
```

## Features

### Oscillator Chain

Each sound starts with one or more oscillators. Oscillator types:

| Type | Shape |
|---|---|
| Sine | Pure tone |
| Square | Buzzy, hollow |
| Sawtooth | Bright, brassy |
| Triangle | Soft, flute-like |
| Noise (White) | Broadband hiss |
| Noise (Pink) | Weighted hiss, more natural |

Multiple oscillators are summed before the envelope stage. Detune and frequency modulation (FM) between oscillators is available in the oscillator settings panel.

### ADSR Envelope

Standard attack / decay / sustain / release envelope applied after mixing oscillators. Drag handles on the visual envelope shape or enter numeric values directly.

### Filter Chain

Up to 3 filters in series:

| Filter Type | Description |
|---|---|
| Low Pass | Removes high frequencies, softens sound |
| High Pass | Removes low frequencies, thins sound |
| Band Pass | Passes a frequency band, nasal tone |
| Notch | Cuts a specific frequency |

Each filter has frequency and Q (resonance) parameters.

### Effects Chain

| Effect | Parameters | Description |
|---|---|---|
| Reverb | Room size, wet mix | Convolution-based room ambience |
| Delay | Time, feedback, wet | Echo repeat |
| Distortion | Drive, curve type | Harmonic saturation and clipping |
| Chorus | Rate, depth, wet | Pitch modulation shimmer |

Effects are applied in list order. Drag to reorder.

### Waveform and Spectrogram

The waveform view shows the rendered output in the time domain. The spectrogram below it shows frequency content over time using a short-time Fourier transform, rendered as a heat map. Both update live as parameters change.

Peak level in dBFS is shown below the waveform. A clip indicator lights red if the output exceeds 0 dBFS.

### Built-In Presets

| Preset | Description |
|---|---|
| `footstep` | Low-frequency thud with short decay, slight noise layer |
| `dialog_open` | Rising two-tone chime |
| `dialog_close` | Falling two-tone chime |
| `dialog_blip` | Short sine blip for text character advance |
| `torch_crackle` | Pink noise burst with fast attack and slow irregular decay |
| `coin_pickup` | Two ascending sine tones, staccato |
| `explosion` | White noise with high drive distortion and long reverb tail |
| `sword_slash` | Fast high-frequency sweep with noise component |
| `laser_shot` | Sci-fi laser beam — fast sine sweep down |
| `magic_spell` | Rising ethereal sparkle with delay |
| `water_splash` | Short water impact with reverb tail |
| `powerup` | Rising sweep power-up jingle |
| `alarm_beep` | Warning siren — oscillating square wave |

Selecting a preset loads its full synthesis chain configuration. Modifications do not overwrite the preset until "Save Preset" is clicked.

### WAV Export

Clicking "Export WAV" renders the full synthesis chain to a 44100 Hz 16-bit mono WAV buffer and uploads it to `assets/audio/` via the bridge REST API. The engine picks up the new file the next time `AudioSystem::init()` loads it (on scene reload or restart).

The filename defaults to the preset name. It can be overridden in the export dialog.

### Smart Generate (Procedural)

The "Smart Generate" panel converts a text description into synth parameters using keyword matching. No server or external AI model is required — everything runs in the browser.

Type a description like `"deep explosion with echo"` or `"bright laser zap"` and click **Generate**. The system matches keywords against 15 built-in rules:

| Keywords | Sound type |
|---|---|
| explosion, blast, boom | Noise + low saw, distortion, reverb |
| laser, zap, beam | High sine sweep down, short |
| coin, pickup, gem | Bright sine + triangle, short |
| footstep, step, walk | Noise burst + bandpass |
| water, splash, drip | Noise + lowpass sweep, reverb |
| sword, slash, swing | Noise + highpass, fast attack |
| magic, spell, enchant | Sine + delay + reverb, freq modulation |
| fire, flame, torch | Noise + bandpass + distortion |
| wind, whoosh, gust | Noise + bandpass sweep, slow attack |
| click, ui, button | Short sine pulse |
| bell, chime, ding | Sine harmonics, long release |
| thunder, rumble | Low noise, long release, heavy reverb |
| alarm, siren, alert | Square wave frequency oscillation |
| powerup, levelup | Sine upward sweep |
| hit, punch, thud | Noise + sine burst, very short |

**Modifier keywords** adjust the base sound further:

| Modifier | Effect |
|---|---|
| deep, low, bass | Halves all frequencies |
| high, bright, sharp | Doubles all frequencies |
| long, sustained, slow | Doubles duration and release |
| short, quick, fast | Halves duration and release |
| echo, reverb, spacious | Boosts reverb room size and mix |
| distorted, dirty, gritty | Adds distortion |
| delay, repeat | Enables delay effect |

Quick-fill chips are provided for common SFX types. The generated parameters load into the synth editor so you can fine-tune them further.

### AI Generation (Optional — Stable Audio)

For local AI audio generation, you can run the Stable Audio server. This is recommended for studios with local GPU hardware:

1. Install dependencies: `pip install flask stable-audio-tools`
2. Start the server: `python tools/scripts/stable-audio-server.py`
3. Set `VITE_STABLE_AUDIO_URL=http://localhost:8001` in `tools/.env`

The server wraps `stable-audio-open-small` (up to 11 seconds, 44.1 kHz stereo). A CUDA GPU is recommended.

### AI Generation (Optional — Replicate)

For cloud-based AI audio generation, you can optionally use the Replicate API. Set `VITE_REPLICATE_API_TOKEN` in `tools/.env` with your API token from [replicate.com](https://replicate.com/account/api-tokens). This is not required — the built-in procedural generation covers most game SFX needs.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / stop preview |
| `Ctrl+S` | Save and export |
| `Ctrl+Z` | Undo parameter change |
| `Ctrl+Y` | Redo parameter change |
