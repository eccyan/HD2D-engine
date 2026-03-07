import React from 'react';
import type { CharacterFrame, FrameStatus } from '@vulkan-game-tools/asset-types';
import { frameThumbnailUrl } from '../../lib/bridge-api.js';

const STATUS_COLORS: Record<FrameStatus, string> = {
  pending: '#666',
  generating: '#cc8800',
  generated: '#aa8800',
  approved: '#44aa44',
  rejected: '#aa4444',
};

const STATUS_LABELS: Record<FrameStatus, string> = {
  pending: 'P',
  generating: '...',
  generated: 'G',
  approved: 'OK',
  rejected: 'X',
};

interface Props {
  frame: CharacterFrame;
  animName: string;
  characterId: string;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onClick: () => void;
}

export function FrameCell({ frame, animName, characterId, onApprove, onReject, onRegenerate, onClick }: Props) {
  const hasImage = frame.status !== 'pending' && frame.status !== 'generating';

  return (
    <div onClick={onClick} style={{ ...styles.cell, borderColor: STATUS_COLORS[frame.status] }} data-testid={`frame-cell-${animName}-${frame.index}`}>
      <div style={{ ...styles.badge, background: STATUS_COLORS[frame.status] }}>
        {STATUS_LABELS[frame.status]}
      </div>

      <div style={styles.imageBox}>
        {hasImage ? (
          <img
            src={frameThumbnailUrl(characterId, animName, frame.index)}
            alt={`${animName} f${frame.index}`}
            style={styles.frameImage}
          />
        ) : (
          <div style={styles.frameIndex}>f{frame.index}</div>
        )}
      </div>

      <div style={styles.actions}>
        <button
          onClick={(e) => { e.stopPropagation(); onApprove(); }}
          style={styles.approveBtn}
          title="Approve"
        >
          OK
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReject(); }}
          style={styles.rejectBtn}
          title="Reject"
        >
          X
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          style={styles.regenBtn}
          title="Regenerate"
        >
          Re
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cell: {
    width: 72,
    border: '2px solid',
    borderRadius: 4,
    background: '#161624',
    cursor: 'pointer',
    position: 'relative',
    padding: 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 8,
    color: '#fff',
    padding: '0 3px',
    borderRadius: 2,
    fontFamily: 'monospace',
    zIndex: 1,
  },
  imageBox: {
    width: '100%',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111120',
    borderRadius: 2,
    overflow: 'hidden',
  },
  frameImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  frameIndex: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#ccc',
  },
  actions: {
    display: 'flex',
    gap: 1,
    padding: '3px 2px 2px',
    justifyContent: 'center',
  },
  approveBtn: {
    fontSize: 9,
    padding: '1px 4px',
    background: '#253525',
    border: 'none',
    color: '#8d8',
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'monospace',
  },
  rejectBtn: {
    fontSize: 9,
    padding: '1px 4px',
    background: '#352525',
    border: 'none',
    color: '#d88',
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'monospace',
  },
  regenBtn: {
    fontSize: 9,
    padding: '1px 4px',
    background: '#252535',
    border: 'none',
    color: '#88d',
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'monospace',
  },
};
