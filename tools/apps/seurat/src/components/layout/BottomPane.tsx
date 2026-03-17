import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { AnimationPreviewCanvas } from '../animate/AnimationPreviewCanvas.js';
import { FramePreviewCanvas } from '../animate/FramePreviewCanvas.js';
import { ClipTimeline } from '../animate/ClipTimeline.js';

export function BottomPane() {
  const treeSelection = useSeuratStore((s) => s.treeSelection);
  const manifest = useSeuratStore((s) => s.manifest);
  const spriteSheetUrl = useSeuratStore((s) => s.spriteSheetUrl);
  const playbackState = useSeuratStore((s) => s.playbackState);
  const currentTime = useSeuratStore((s) => s.currentTime);
  const selectClip = useSeuratStore((s) => s.selectClip);

  const [collapsed, setCollapsed] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = React.useState(0);

  const animName = treeSelection.kind === 'animation' ? treeSelection.animName : null;

  // Auto-select clip (must be before any early returns)
  React.useEffect(() => {
    if (animName) selectClip(animName);
  }, [animName]);

  // Observe content height for square preview
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContentHeight(Math.floor(entries[0].contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (treeSelection.kind !== 'animation' || !manifest) return null;

  const clip = manifest.animations.find((a) => a.name === animName);
  if (!clip) return null;

  const hasGeneratedFrames = clip.frames.some((f) => f.status !== 'pending' && f.status !== 'generating');
  const useFramePreview = !spriteSheetUrl && hasGeneratedFrames;

  return (
    <div data-testid="bottom-pane" style={{
      ...styles.container,
      height: collapsed ? 30 : 240,
    }}>
      {/* Toggle handle */}
      <div
        style={styles.handle}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={styles.handleLabel}>
          {collapsed ? '\u25B2' : '\u25BC'} Animation Preview
        </span>
        <span style={styles.handleInfo}>
          {clip.name} ({clip.frames.length} frames)
        </span>
      </div>

      {!collapsed && (
        <div ref={contentRef} style={styles.content}>
          {/* Square preview — width = content height */}
          <div style={{
            ...styles.preview,
            width: contentHeight > 0 ? contentHeight : '50%',
            minWidth: contentHeight > 0 ? contentHeight : '50%',
          }}>
            {useFramePreview ? (
              <FramePreviewCanvas
                characterId={manifest.character_id}
                clip={clip}
                currentTime={currentTime}
                playbackState={playbackState}
              />
            ) : (
              <AnimationPreviewCanvas
                spriteSheetUrl={spriteSheetUrl}
                spritesheet={manifest.spritesheet}
                clip={clip}
                currentTime={currentTime}
                playbackState={playbackState}
                selectedFrameIndex={0}
              />
            )}
          </div>

          {/* Timeline — fills remaining width */}
          <div style={styles.timeline}>
            <ClipTimeline clip={clip} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid #2a2a3a',
    background: '#111120',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    transition: 'height 0.2s ease',
  },
  handle: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '6px 12px',
    background: '#161628',
    cursor: 'pointer',
    flexShrink: 0,
    borderBottom: '1px solid #2a2a3a',
    userSelect: 'none',
  },
  handleLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
    color: '#888',
  },
  handleInfo: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  preview: {
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    borderRight: '1px solid #2a2a3a',
    flexShrink: 0,
  },
  timeline: {
    flex: 1,
    overflow: 'hidden',
  },
};
