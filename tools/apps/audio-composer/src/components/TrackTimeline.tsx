import React, { useRef, useCallback } from 'react';
import { useComposerStore, LayerId } from '../store/useComposerStore.js';
import { WaveformDisplay } from './WaveformDisplay.js';
import { AudioPlayerHandle } from './AudioPlayer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TrackTimelineProps {
  playerRef: React.RefObject<AudioPlayerHandle | null>;
}

// ---------------------------------------------------------------------------
// Lane header widths
// ---------------------------------------------------------------------------
const HEADER_W = 140;
const LANE_H = 100;

// ---------------------------------------------------------------------------
// TrackTimeline
// ---------------------------------------------------------------------------
export function TrackTimeline({ playerRef }: TrackTimelineProps) {
  const layers = useComposerStore((s) => s.layers);
  const playheadSec = useComposerStore((s) => s.playheadSec);
  const loopRegion = useComposerStore((s) => s.loopRegion);
  const loopEnabled = useComposerStore((s) => s.loopEnabled);
  const {
    setLayerVolume,
    setLayerMuted,
    setLayerSoloed,
    setLoopRegion,
  } = useComposerStore();

  const totalDuration = 30; // seconds total timeline view

  // -------------------------------------------------------------------------
  // File drop handling
  // -------------------------------------------------------------------------
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, layerId: LayerId) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.endsWith('.wav')) {
        alert('Only .wav files are supported (44100 Hz, 16-bit PCM mono).');
        return;
      }
      const buf = await file.arrayBuffer();
      await playerRef.current?.loadLayerBuffer(layerId, buf);
    },
    [playerRef],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={styles.root}>
      {layers.map((layer) => {
        const anySoloed = layers.some((l) => l.soloed);
        const dimmed = anySoloed && !layer.soloed;

        return (
          <div
            key={layer.id}
            style={{ ...styles.lane, opacity: dimmed ? 0.4 : 1 }}
          >
            {/* Lane header */}
            <div style={{ ...styles.header, borderLeft: `3px solid ${layer.color}` }}>
              <div style={styles.headerLabel}>{layer.label}</div>

              {/* Mute/Solo */}
              <div style={styles.headerButtons}>
                <LaneButton
                  label="M"
                  active={layer.muted}
                  activeColor="#e07040"
                  onClick={() => setLayerMuted(layer.id, !layer.muted)}
                  title="Mute"
                />
                <LaneButton
                  label="S"
                  active={layer.soloed}
                  activeColor="#e0c040"
                  onClick={() => setLayerSoloed(layer.id, !layer.soloed)}
                  title="Solo"
                />
              </div>

              {/* Volume slider */}
              <div style={styles.volumeRow}>
                <span style={styles.volLabel}>VOL</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.volume}
                  onChange={(e) => setLayerVolume(layer.id, parseFloat(e.target.value))}
                  style={styles.volSlider}
                />
                <span style={styles.volValue}>{(layer.volume * 100).toFixed(0)}</span>
              </div>

              {/* Load WAV button */}
              <label style={styles.loadBtn} title="Load WAV file">
                Load WAV
                <input
                  type="file"
                  accept=".wav,audio/wav"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const buf = await file.arrayBuffer();
                    await playerRef.current?.loadLayerBuffer(layer.id, buf);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* Waveform area */}
            <div
              style={styles.waveformArea}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragOver={handleDragOver}
            >
              <WaveformDisplay
                audioBuffer={layer.audioBuffer}
                playheadSec={playheadSec}
                loopStart={loopRegion.startSec}
                loopEnd={loopRegion.endSec}
                duration={totalDuration}
                color={layer.color}
                onLoopChange={(start, end) => setLoopRegion({ startSec: start, endSec: end })}
                onSeek={(sec) => playerRef.current?.seek(sec)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LaneButton
// ---------------------------------------------------------------------------
interface LaneButtonProps {
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  title?: string;
}

function LaneButton({ label, active, activeColor, onClick, title }: LaneButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 22,
        height: 18,
        background: active ? activeColor + '33' : '#1a1a1a',
        border: `1px solid ${active ? activeColor : '#333'}`,
        borderRadius: 3,
        color: active ? activeColor : '#555',
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    background: '#111',
  },
  lane: {
    display: 'flex',
    height: LANE_H,
    borderBottom: '1px solid #222',
    transition: 'opacity 0.15s',
  },
  header: {
    width: HEADER_W,
    minWidth: HEADER_W,
    background: '#1a1a1a',
    borderRight: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 8px',
    gap: 4,
  },
  headerLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    color: '#ccc',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  headerButtons: {
    display: 'flex',
    gap: 3,
  },
  volumeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  volLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    width: 22,
  },
  volSlider: {
    flex: 1,
    height: 3,
    appearance: 'none' as const,
    background: '#333',
    cursor: 'pointer',
  },
  volValue: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
    width: 24,
    textAlign: 'right' as const,
  },
  loadBtn: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 3,
    padding: '2px 5px',
    cursor: 'pointer',
    textAlign: 'center' as const,
    marginTop: 2,
  },
  waveformArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
};
