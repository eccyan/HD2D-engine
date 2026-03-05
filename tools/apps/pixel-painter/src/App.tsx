import React, { useEffect } from 'react';
import { usePainterStore, DrawingTool } from './store/usePainterStore.js';
import { PixelCanvas } from './components/PixelCanvas.js';
import { TilesetView } from './components/TilesetView.js';
import { SpriteSheetView } from './components/SpriteSheetView.js';
import { ColorPalettePanel } from './components/ColorPalettePanel.js';
import { AIGeneratePanel } from './components/AIGeneratePanel.js';

// ---------------------------------------------------------------------------
// Toolbar button component
// ---------------------------------------------------------------------------

interface ToolButtonProps {
  tool: DrawingTool;
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ tool, label, shortcut, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      style={{
        background: active ? '#1e3a6e' : 'transparent',
        border: active ? '1px solid #4a9ef8' : '1px solid #444',
        borderRadius: 4,
        color: active ? '#90b8f8' : '#888',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        minWidth: 44,
      }}
    >
      <span style={{ fontSize: 13 }}>{toolIcon(tool)}</span>
      <span style={{ fontSize: 8 }}>{label}</span>
      <span style={{ fontSize: 7, color: active ? '#6090d0' : '#555' }}>[{shortcut}]</span>
    </button>
  );
}

function toolIcon(tool: DrawingTool): string {
  switch (tool) {
    case 'pencil': return 'P';
    case 'eraser': return 'E';
    case 'line': return '/';
    case 'rect': return '[]';
    case 'fill': return 'G';
    case 'eyedropper': return 'I';
    default: return '?';
  }
}

// ---------------------------------------------------------------------------
// Mirror mode button
// ---------------------------------------------------------------------------

const MIRROR_MODES = ['none', 'horizontal', 'vertical', 'both'] as const;
const MIRROR_LABELS: Record<string, string> = {
  none: 'No Mirror',
  horizontal: 'Mirror H',
  vertical: 'Mirror V',
  both: 'Mirror HV',
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const {
    activeTool,
    mirrorMode,
    zoom,
    showGrid,
    showAIPanel,
    editTarget,
    fgColor,
    bgColor,
    setActiveTool,
    setMirrorMode,
    setZoom,
    toggleGrid,
    setShowAIPanel,
    setEditTarget,
    undo,
    redo,
  } = usePainterStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p': setActiveTool('pencil'); break;
        case 'e': setActiveTool('eraser'); break;
        case 'l': setActiveTool('line'); break;
        case 'r': setActiveTool('rect'); break;
        case 'g': setActiveTool('fill'); break;
        case 'i': setActiveTool('eyedropper'); break;
        case ']': setZoom(Math.min(32, zoom + 4)); break;
        case '[': setZoom(Math.max(4, zoom - 4)); break;
        case 'h': toggleGrid(); break;
        case 'a': setShowAIPanel(!showAIPanel); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setActiveTool, setZoom, zoom, toggleGrid, setShowAIPanel, showAIPanel]);

  const tools: Array<{ tool: DrawingTool; label: string; shortcut: string }> = [
    { tool: 'pencil', label: 'Pencil', shortcut: 'P' },
    { tool: 'eraser', label: 'Eraser', shortcut: 'E' },
    { tool: 'line', label: 'Line', shortcut: 'L' },
    { tool: 'rect', label: 'Rect', shortcut: 'R' },
    { tool: 'fill', label: 'Fill', shortcut: 'G' },
    { tool: 'eyedropper', label: 'Pick', shortcut: 'I' },
  ];

  const [fgR, fgG, fgB, fgA] = fgColor;
  const [bgR, bgG, bgB, bgA] = bgColor;

  return (
    <div style={styles.app}>
      {/* ---------------------------------------------------------------- */}
      {/* TOP TOOLBAR                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div style={styles.toolbar}>
        {/* App title */}
        <div style={styles.appTitle}>
          Pixel Painter
        </div>

        <div style={styles.toolbarDivider} />

        {/* Edit target toggle */}
        <div style={styles.toolbarGroup}>
          <button
            onClick={() => setEditTarget('tileset')}
            style={{
              ...styles.targetBtn,
              background: editTarget === 'tileset' ? '#1e3a6e' : 'transparent',
              borderColor: editTarget === 'tileset' ? '#4a9ef8' : '#444',
              color: editTarget === 'tileset' ? '#90b8f8' : '#777',
            }}
          >
            Tileset
          </button>
          <button
            onClick={() => setEditTarget('spritesheet')}
            style={{
              ...styles.targetBtn,
              background: editTarget === 'spritesheet' ? '#3a2a1a' : 'transparent',
              borderColor: editTarget === 'spritesheet' ? '#f8a84a' : '#444',
              color: editTarget === 'spritesheet' ? '#f8a84a' : '#777',
            }}
          >
            Sprites
          </button>
        </div>

        <div style={styles.toolbarDivider} />

        {/* Drawing tools */}
        <div style={styles.toolbarGroup}>
          {tools.map(({ tool, label, shortcut }) => (
            <ToolButton
              key={tool}
              tool={tool}
              label={label}
              shortcut={shortcut}
              active={activeTool === tool}
              onClick={() => setActiveTool(tool)}
            />
          ))}
        </div>

        <div style={styles.toolbarDivider} />

        {/* Mirror mode */}
        <div style={styles.toolbarGroup}>
          <span style={styles.toolbarLabel}>Mirror:</span>
          {MIRROR_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setMirrorMode(mode)}
              style={{
                ...styles.mirrorBtn,
                background: mirrorMode === mode ? '#1e2e1e' : 'transparent',
                borderColor: mirrorMode === mode ? '#3a8a3a' : '#444',
                color: mirrorMode === mode ? '#70d870' : '#666',
              }}
              title={`Mirror: ${mode}`}
            >
              {MIRROR_LABELS[mode]}
            </button>
          ))}
        </div>

        <div style={styles.toolbarDivider} />

        {/* Zoom */}
        <div style={styles.toolbarGroup}>
          <span style={styles.toolbarLabel}>Zoom:</span>
          <button
            onClick={() => setZoom(Math.max(4, zoom - 4))}
            style={styles.zoomBtn}
            title="Zoom out [["
          >-</button>
          <span style={styles.zoomValue}>{zoom}x</span>
          <button
            onClick={() => setZoom(Math.min(32, zoom + 4))}
            style={styles.zoomBtn}
            title="Zoom in ]"
          >+</button>
          {[8, 16, 24, 32].map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              style={{
                ...styles.zoomPresetBtn,
                background: zoom === z ? '#2a3a5a' : 'transparent',
                borderColor: zoom === z ? '#4a6ab8' : '#444',
                color: zoom === z ? '#90b8f8' : '#666',
              }}
            >
              {z}x
            </button>
          ))}
        </div>

        <div style={styles.toolbarDivider} />

        {/* Grid + Undo/Redo */}
        <div style={styles.toolbarGroup}>
          <button
            onClick={toggleGrid}
            style={{
              ...styles.iconBtn,
              background: showGrid ? '#2a3a2a' : 'transparent',
              borderColor: showGrid ? '#3a7a3a' : '#444',
              color: showGrid ? '#70d870' : '#666',
            }}
            title="Toggle grid [H]"
          >
            Grid
          </button>
          <button onClick={undo} style={styles.iconBtn} title="Undo [Ctrl+Z]">
            Undo
          </button>
          <button onClick={redo} style={styles.iconBtn} title="Redo [Ctrl+Y]">
            Redo
          </button>
        </div>

        <div style={styles.toolbarDivider} />

        {/* AI Panel toggle */}
        <button
          onClick={() => setShowAIPanel(!showAIPanel)}
          style={{
            ...styles.iconBtn,
            background: showAIPanel ? '#2a1a3a' : 'transparent',
            borderColor: showAIPanel ? '#7a4ab8' : '#444',
            color: showAIPanel ? '#c080f8' : '#666',
          }}
          title="AI Generation panel [A]"
        >
          AI Gen
        </button>

        <div style={{ flex: 1 }} />

        {/* Color preview in toolbar */}
        <div style={styles.toolbarColorPreview}>
          <div
            style={{
              width: 20,
              height: 20,
              background: `rgba(${bgR},${bgG},${bgB},${bgA / 255})`,
              border: '1px solid #555',
              borderRadius: 2,
              position: 'absolute',
              top: 8,
              left: 8,
            }}
            title="Background color"
          />
          <div
            style={{
              width: 20,
              height: 20,
              background: `rgba(${fgR},${fgG},${fgB},${fgA / 255})`,
              border: '2px solid #4a9ef8',
              borderRadius: 2,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            title="Foreground color"
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* BODY                                                              */}
      {/* ---------------------------------------------------------------- */}
      <div style={styles.body}>
        {/* LEFT: Sheet views */}
        <div style={styles.leftPanel}>
          <div style={styles.leftScroll}>
            <TilesetView />
            <SpriteSheetView />
          </div>
        </div>

        {/* CENTER: Pixel canvas */}
        <div style={styles.centerArea}>
          <ZoomFollowingCanvas />
        </div>

        {/* RIGHT: Color palette + AI panel */}
        <div style={styles.rightPanel}>
          <div style={styles.rightScroll}>
            <ColorPalettePanel />
            {showAIPanel && <AIGeneratePanel />}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* STATUS BAR                                                        */}
      {/* ---------------------------------------------------------------- */}
      <StatusBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function StatusBar() {
  const { activeTool, mirrorMode, zoom, editTarget, selectedTileCol, selectedTileRow, selectedFrameCol, selectedFrameRow, fgColor } = usePainterStore();

  const [r, g, b, a] = fgColor;

  const tileInfo = editTarget === 'tileset'
    ? `Tileset tile (${selectedTileCol},${selectedTileRow}) = ID ${selectedTileRow * 8 + selectedTileCol}`
    : `Sprite row ${selectedFrameRow} frame ${selectedFrameCol}`;

  return (
    <div style={styles.statusBar}>
      <span style={styles.statusItem}>Tool: <strong>{activeTool}</strong></span>
      <span style={styles.statusSep}>|</span>
      <span style={styles.statusItem}>Zoom: {zoom}x</span>
      <span style={styles.statusSep}>|</span>
      <span style={styles.statusItem}>Mirror: {mirrorMode}</span>
      <span style={styles.statusSep}>|</span>
      <span style={styles.statusItem}>{tileInfo}</span>
      <span style={styles.statusSep}>|</span>
      <span style={styles.statusItem}>
        FG: <span style={{ color: `rgb(${r},${g},${b})` }}>rgba({r},{g},{b},{(a / 255).toFixed(2)})</span>
      </span>
      <div style={{ flex: 1 }} />
      <span style={styles.statusItem}>16×16 Pixel Art Editor</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zoom-following canvas wrapper (re-mounts canvas when zoom changes)
// ---------------------------------------------------------------------------

function ZoomFollowingCanvas() {
  const zoom = usePainterStore((s) => s.zoom);
  const size = zoom * 16;
  return <PixelCanvas width={size} height={size} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#12121e',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a4a',
    flexShrink: 0,
    overflowX: 'auto',
  },
  appTitle: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#9090d0',
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
  toolbarDivider: {
    width: 1,
    height: 28,
    background: '#333',
    flexShrink: 0,
    marginLeft: 2,
    marginRight: 2,
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  toolbarLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    flexShrink: 0,
  },
  targetBtn: {
    border: '1px solid',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
    padding: '4px 10px',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  mirrorBtn: {
    border: '1px solid',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 8,
    padding: '3px 6px',
    cursor: 'pointer',
  },
  zoomBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 13,
    width: 22,
    height: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  zoomValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#aaa',
    minWidth: 28,
    textAlign: 'center',
  },
  zoomPresetBtn: {
    border: '1px solid',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 8,
    padding: '2px 5px',
    cursor: 'pointer',
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 7px',
    cursor: 'pointer',
  },
  toolbarColorPreview: {
    position: 'relative',
    width: 36,
    height: 28,
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    width: 200,
    borderRight: '1px solid #2a2a4a',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  leftScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  centerArea: {
    flex: 1,
    overflow: 'auto',
    background: '#111122',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rightPanel: {
    width: 220,
    borderLeft: '1px solid #2a2a4a',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  rightScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 12px',
    background: '#16162a',
    borderTop: '1px solid #2a2a4a',
    flexShrink: 0,
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#777',
  },
  statusItem: {
    flexShrink: 0,
  },
  statusSep: {
    color: '#333',
    flexShrink: 0,
  },
};
