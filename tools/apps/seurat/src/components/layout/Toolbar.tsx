import React, { useState, useEffect, useRef } from 'react';
import type { TreeSelection } from '../../store/types.js';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { getClipDuration } from '../../lib/frame-utils.js';
import { ProjectDialog } from '../project/ProjectDialog.js';
import { ExportDialog } from '../project/ExportDialog.js';

function getSelectionLabel(sel: TreeSelection): string {
  switch (sel.kind) {
    case 'manifest': return 'Manifest';
    case 'character': return `Character: ${sel.characterId}`;
    case 'animation': return `${sel.characterId} / ${sel.animName}`;
  }
}

export function Toolbar() {
  const treeSelection = useSeuratStore((s) => s.treeSelection);
  const project = useSeuratStore((s) => s.project);
  const projectDirty = useSeuratStore((s) => s.projectDirty);
  const saveProject = useSeuratStore((s) => s.saveProject);
  const closeProject = useSeuratStore((s) => s.closeProject);

  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Debounced auto-save on dirty
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (project && projectDirty) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveProject();
      }, 2000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [project, projectDirty, saveProject]);

  const handleClose = () => {
    if (projectDirty) {
      setShowCloseConfirm(true);
    } else {
      closeProject();
    }
  };

  const confirmClose = async (save: boolean) => {
    if (save) await saveProject();
    await closeProject();
    setShowCloseConfirm(false);
  };

  return (
    <>
      <div style={styles.toolbar}>
        <span style={styles.appTitle}>SEURAT</span>
        <span style={styles.divider} />

        {project ? (
          <>
            <span style={styles.projectName}>{project.name}</span>
            {projectDirty && <span style={styles.dirtyDot} title="Unsaved changes" />}
            <button onClick={() => saveProject()} style={styles.tbBtn} title="Save Project">
              Save
            </button>
            <button onClick={handleClose} style={styles.tbBtn} title="Close Project">
              Close
            </button>
            <button onClick={() => setShowExportDialog(true)} style={styles.tbBtn} title="Export">
              Export
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowProjectDialog(true)} style={styles.tbBtn} title="New / Open Project">
              Project
            </button>
          </>
        )}

        <span style={styles.divider} />
        <span style={styles.sectionTitle}>{getSelectionLabel(treeSelection)}</span>
        <div style={{ flex: 1 }} />
      </div>

      {showProjectDialog && (
        <ProjectDialog onClose={() => setShowProjectDialog(false)} />
      )}
      {showExportDialog && (
        <ExportDialog onClose={() => setShowExportDialog(false)} />
      )}
      {showCloseConfirm && (
        <div style={styles.overlay} onClick={() => setShowCloseConfirm(false)}>
          <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>Unsaved changes. Save before closing?</p>
            <div style={styles.confirmBtns}>
              <button onClick={() => confirmClose(true)} style={styles.tbBtn}>Save & Close</button>
              <button onClick={() => confirmClose(false)} style={styles.tbBtn}>Discard</button>
              <button onClick={() => setShowCloseConfirm(false)} style={styles.tbBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PlaybackControls() {
  const playbackState = useSeuratStore((s) => s.playbackState);
  const currentTime = useSeuratStore((s) => s.currentTime);
  const manifest = useSeuratStore((s) => s.manifest);
  const selectedClipName = useSeuratStore((s) => s.selectedClipName);
  const { setPlaybackState, setCurrentTime } = useSeuratStore();

  const clip = manifest?.animations.find((a) => a.name === selectedClipName);
  const duration = clip ? getClipDuration(clip) : 0;

  const handlePlay = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    } else {
      if (currentTime >= duration && !clip?.loop) setCurrentTime(0);
      setPlaybackState('playing');
    }
  };

  const handleStop = () => {
    setPlaybackState('stopped');
    setCurrentTime(0);
  };

  return (
    <>
      <button onClick={handleStop} style={styles.tbBtn} title="Stop">
        &#9632;
      </button>
      <button
        onClick={handlePlay}
        style={{
          ...styles.tbBtn,
          background: playbackState === 'playing' ? '#2a3a5a' : '#1e1e30',
          color: playbackState === 'playing' ? '#90b8f8' : '#aaa',
        }}
        title={playbackState === 'playing' ? 'Pause' : 'Play'}
      >
        {playbackState === 'playing' ? '\u23F8' : '\u25B6'}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.001}
        value={Math.min(currentTime, duration || 1)}
        onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
        style={{ width: 160, accentColor: '#f0c040', height: 4 }}
      />
      <span style={styles.timeLabel}>
        {currentTime.toFixed(3)}s / {duration.toFixed(3)}s
      </span>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    height: 36,
    background: '#1a1a2a',
    borderBottom: '1px solid #2a2a3a',
    flexShrink: 0,
  },
  appTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#4a6a9a',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  divider: {
    width: 1,
    height: 20,
    background: '#333',
    flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#aaa',
    fontWeight: 600,
  },
  projectName: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#c0d0f0',
    fontWeight: 600,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#f0c040',
    flexShrink: 0,
  },
  tbBtn: {
    background: '#1e1e30',
    border: '1px solid #333',
    borderRadius: 3,
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  timeLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    minWidth: 100,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  confirmDialog: {
    background: '#1a1a2a',
    border: '1px solid #3a3a5a',
    borderRadius: 8,
    padding: 20,
  },
  confirmText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ddd',
    margin: '0 0 12px',
  },
  confirmBtns: {
    display: 'flex',
    gap: 8,
  },
};
