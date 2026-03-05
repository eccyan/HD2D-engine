import React, { useCallback, useState } from 'react';
import { useAnimatorStore, getClipDuration } from '../store/useAnimatorStore.js';

// ---------------------------------------------------------------------------
// ClipList — left panel showing all animation clips
// ---------------------------------------------------------------------------

export function ClipList() {
  const clips = useAnimatorStore((s) => s.clips);
  const selectedClipId = useAnimatorStore((s) => s.selectedClipId);
  const { addClip, removeClip, renameClip, selectClip, toggleClipLoop } = useAnimatorStore();

  const [newClipName, setNewClipName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleAdd = useCallback(() => {
    const name = newClipName.trim() || `clip_${clips.length}`;
    addClip(name);
    setNewClipName('');
  }, [newClipName, clips.length, addClip]);

  const startRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renameClip(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, renameClip]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#181826',
        borderRight: '1px solid #2a2a3a',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '4px 8px',
          background: '#1a1a2a',
          borderBottom: '1px solid #2a2a3a',
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#666',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
      >
        CLIPS
        <span style={{ float: 'right', color: '#444' }}>{clips.length}</span>
      </div>

      {/* Clip list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {clips.map((clip) => {
          const isSelected = clip.id === selectedClipId;
          const isRenaming = clip.id === renamingId;
          const duration = getClipDuration(clip);

          return (
            <div
              key={clip.id}
              onClick={() => selectClip(clip.id)}
              style={{
                padding: '4px 8px',
                borderBottom: '1px solid #1e1e2e',
                background: isSelected ? '#1e2a42' : 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1a2a3a',
                    border: '1px solid #4a6aaa',
                    borderRadius: 2,
                    color: '#ddd',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    padding: '1px 4px',
                    outline: 'none',
                  }}
                />
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: isSelected ? '#c0d8ff' : '#aaa',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(clip.id, clip.name);
                      }}
                      title={clip.name}
                    >
                      {clip.name}
                    </span>
                    {clip.loop && (
                      <span style={{ fontSize: 8, color: '#4a7a9a' }}>↻</span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 1,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#445' }}>
                      {clip.frames.length}fr &nbsp; {duration.toFixed(2)}s
                    </span>
                    <div style={{ flex: 1 }} />
                    {/* Action buttons — show on selected */}
                    {isSelected && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(clip.id, clip.name); }}
                          style={iconBtnStyle}
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleClipLoop(clip.id); }}
                          style={{ ...iconBtnStyle, color: clip.loop ? '#4a9aaa' : '#555' }}
                          title={clip.loop ? 'Disable loop' : 'Enable loop'}
                        >
                          ↻
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                          style={{ ...iconBtnStyle, color: '#883333' }}
                          title="Delete clip"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add clip */}
      <div
        style={{
          padding: '6px 8px',
          background: '#1a1a28',
          borderTop: '1px solid #2a2a3a',
          flexShrink: 0,
          display: 'flex',
          gap: 4,
        }}
      >
        <input
          type="text"
          value={newClipName}
          onChange={(e) => setNewClipName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="clip name..."
          style={{
            flex: 1,
            background: '#1a1a2a',
            border: '1px solid #333',
            borderRadius: 3,
            color: '#ccc',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '3px 6px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            background: '#1a2a1a',
            border: '1px solid #2a4a2a',
            borderRadius: 3,
            color: '#70d870',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '0 2px',
  cursor: 'pointer',
  lineHeight: 1,
};
