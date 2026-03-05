import React, { useCallback, useState } from 'react';
import {
  useAnimatorStore,
  tileUVs,
  AnimFrame,
  TilesetConfig,
} from '../store/useAnimatorStore.js';

// ---------------------------------------------------------------------------
// ClipProperties — right-panel properties editor
// ---------------------------------------------------------------------------

export function ClipProperties() {
  const clips = useAnimatorStore((s) => s.clips);
  const selectedClipId = useAnimatorStore((s) => s.selectedClipId);
  const selectedFrameIndex = useAnimatorStore((s) => s.selectedFrameIndex);
  const tileset = useAnimatorStore((s) => s.tileset);
  const {
    renameClip,
    toggleClipLoop,
    addFrame,
    removeFrame,
    updateFrame,
    selectFrame,
    moveFrame,
    updateTileset,
    exportClipsToJson,
  } = useAnimatorStore();

  const clip = clips.find((c) => c.id === selectedClipId) ?? null;
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState('');

  const startRename = useCallback(() => {
    if (!clip) return;
    setRenameValue(clip.name);
    setRenaming(true);
  }, [clip]);

  const commitRename = useCallback(() => {
    if (clip && renameValue.trim()) {
      renameClip(clip.id, renameValue.trim());
    }
    setRenaming(false);
  }, [clip, renameValue, renameClip]);

  const handleExport = useCallback(() => {
    setExportText(exportClipsToJson());
    setExportOpen(true);
  }, [exportClipsToJson]);

  const handleExportCopy = useCallback(() => {
    navigator.clipboard.writeText(exportText).catch(() => {});
  }, [exportText]);

  if (!clip) {
    return (
      <div style={{ ...panelStyle, padding: 16 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#444' }}>
          Select a clip to edit properties.
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* Clip name & loop */}
      <Section title="Clip">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              style={inputStyle}
            />
          ) : (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#c0d8ff',
                flex: 1,
                cursor: 'pointer',
              }}
              onDoubleClick={startRename}
              title="Double-click to rename"
            >
              {clip.name}
            </span>
          )}
          <button onClick={startRename} style={smallBtnStyle}>Rename</button>
        </div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={clip.loop}
            onChange={() => toggleClipLoop(clip.id)}
            style={{ marginRight: 6 }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#aaa' }}>Loop</span>
        </label>

        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#555', marginTop: 6 }}>
          {clip.frames.length} frames &nbsp;|&nbsp;
          {clip.frames.reduce((s, f) => s + f.duration, 0).toFixed(3)}s total
        </div>
      </Section>

      {/* Frame list header */}
      <Section title="Frames">
        {/* Column headers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '1px 4px',
            marginBottom: 4,
            fontFamily: 'monospace',
            fontSize: 8,
            color: '#444',
          }}
        >
          <span style={{ width: 16, textAlign: 'right' }}>#</span>
          <span style={{ width: 36 }}>Tile</span>
          <span style={{ width: 44 }}>Dur(s)</span>
          <span style={{ flex: 1 }}>UV</span>
          <span style={{ width: 44 }}></span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
          {clip.frames.map((frame, fi) => (
            <FrameRow
              key={frame.id}
              frame={frame}
              index={fi}
              selected={fi === selectedFrameIndex}
              tileset={tileset}
              onSelect={() => selectFrame(fi)}
              onChangeTileId={(v) => updateFrame(clip.id, fi, { tile_id: v })}
              onChangeDuration={(v) => updateFrame(clip.id, fi, { duration: v })}
              onRemove={() => removeFrame(clip.id, fi)}
              onMoveUp={fi > 0 ? () => moveFrame(clip.id, fi, fi - 1) : null}
              onMoveDown={fi < clip.frames.length - 1 ? () => moveFrame(clip.id, fi, fi + 1) : null}
            />
          ))}
        </div>
        <button
          onClick={() => addFrame(clip.id, clip.frames[clip.frames.length - 1]?.tile_id ?? 0)}
          style={addBtnStyle}
        >
          + Add Frame
        </button>
      </Section>

      {/* Tileset config */}
      <Section title="Tileset">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NumberField
            label="Tile W"
            value={tileset.tile_width}
            min={1}
            onChange={(v) => updateTileset({ tile_width: v })}
          />
          <NumberField
            label="Tile H"
            value={tileset.tile_height}
            min={1}
            onChange={(v) => updateTileset({ tile_height: v })}
          />
          <NumberField
            label="Columns"
            value={tileset.columns}
            min={1}
            onChange={(v) => updateTileset({ columns: v })}
          />
          <NumberField
            label="Sheet W"
            value={tileset.sheet_width}
            min={1}
            onChange={(v) => updateTileset({ sheet_width: v })}
          />
          <NumberField
            label="Sheet H"
            value={tileset.sheet_height}
            min={1}
            onChange={(v) => updateTileset({ sheet_height: v })}
          />
        </div>
      </Section>

      {/* Export */}
      <Section title="Export">
        <button onClick={handleExport} style={addBtnStyle}>
          Export Clips JSON
        </button>
        {exportOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <button onClick={handleExportCopy} style={smallBtnStyle}>Copy</button>
              <button onClick={() => setExportOpen(false)} style={smallBtnStyle}>Close</button>
            </div>
            <textarea
              readOnly
              value={exportText}
              rows={12}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#141420',
                border: '1px solid #333',
                borderRadius: 3,
                color: '#7ab8f8',
                fontFamily: 'monospace',
                fontSize: 9,
                padding: 4,
                resize: 'vertical',
              }}
            />
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FrameRow
// ---------------------------------------------------------------------------

interface FrameRowProps {
  frame: AnimFrame;
  index: number;
  selected: boolean;
  tileset: TilesetConfig;
  onSelect: () => void;
  onChangeTileId: (v: number) => void;
  onChangeDuration: (v: number) => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
}

function FrameRow({
  frame,
  index,
  selected,
  tileset,
  onSelect,
  onChangeTileId,
  onChangeDuration,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FrameRowProps) {
  const uvs = tileUVs(frame.tile_id, tileset);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 4px',
        borderRadius: 3,
        background: selected ? '#1e2a42' : '#181826',
        border: selected ? '1px solid #4a6aaa' : '1px solid #222',
        cursor: 'pointer',
      }}
    >
      {/* Frame index */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#555',
          width: 16,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {index}
      </span>

      {/* Tile ID */}
      <input
        type="number"
        value={frame.tile_id}
        min={0}
        onChange={(e) => onChangeTileId(Math.max(0, parseInt(e.target.value) || 0))}
        onClick={(e) => e.stopPropagation()}
        title="Tile ID"
        style={{ ...miniInputStyle, width: 36 }}
      />

      {/* Duration */}
      <input
        type="number"
        value={frame.duration}
        min={0.001}
        step={0.01}
        onChange={(e) =>
          onChangeDuration(Math.max(0.001, parseFloat(e.target.value) || 0.1))
        }
        onClick={(e) => e.stopPropagation()}
        title="Duration (seconds)"
        style={{ ...miniInputStyle, width: 44 }}
      />

      {/* UV info */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 8,
          color: '#445566',
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {uvs.u},{uvs.v}
      </span>

      {/* Move up/down */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp?.();
        }}
        disabled={!onMoveUp}
        style={{ ...tinyBtnStyle, opacity: onMoveUp ? 1 : 0.3 }}
        title="Move up"
      >
        ↑
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown?.();
        }}
        disabled={!onMoveDown}
        style={{ ...tinyBtnStyle, opacity: onMoveDown ? 1 : 0.3 }}
        title="Move down"
      >
        ↓
      </button>

      {/* Remove */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{ ...tinyBtnStyle, color: '#e07070' }}
        title="Remove frame"
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NumberField
// ---------------------------------------------------------------------------

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#666',
          width: 52,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
        style={{ ...miniInputStyle, width: 60 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          padding: '4px 8px',
          background: '#1a1a28',
          borderBottom: '1px solid #2a2a3a',
          borderTop: '1px solid #2a2a3a',
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#556677',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '6px 8px' }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#131320',
  overflow: 'hidden',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#1a1a2a',
  border: '1px solid #444',
  borderRadius: 3,
  color: '#ddd',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '3px 6px',
  outline: 'none',
};

const miniInputStyle: React.CSSProperties = {
  background: '#1a1a2a',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#ccc',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '1px 4px',
  outline: 'none',
};

const smallBtnStyle: React.CSSProperties = {
  background: '#222233',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#888',
  fontFamily: 'monospace',
  fontSize: 9,
  padding: '2px 6px',
  cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a2a1a',
  border: '1px solid #2a4a2a',
  borderRadius: 4,
  color: '#70d870',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '4px 0',
  cursor: 'pointer',
};

const tinyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '0 2px',
  cursor: 'pointer',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};
