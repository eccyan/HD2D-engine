import React, { useEffect } from 'react';
import { useMapStore } from './store/useMapStore.js';
import { PixelCanvas } from './components/PixelCanvas.js';
import { ToolBar } from './components/ToolBar.js';
import { MenuBar } from './components/MenuBar.js';
import { PropertiesPanel } from './components/PropertiesPanel.js';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative' as const,
  },
};

export const App: React.FC = () => {
  const setTool = useMapStore(s => s.setTool);
  const setBrushSize = useMapStore(s => s.setBrushSize);
  const undo = useMapStore(s => s.undo);
  const redo = useMapStore(s => s.redo);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Bracket keys: adjust brush size
      if (e.key === '[') {
        setBrushSize(useMapStore.getState().brushSize - 1);
        return;
      }
      if (e.key === ']') {
        setBrushSize(useMapStore.getState().brushSize + 1);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b': setTool('pencil'); break;
        case 'g': setTool('fill'); break;
        case 'e': setTool('eraser'); break;
        case 'r': setTool('rectangle'); break;
        case 'l': setTool('line'); break;
        case 'h': setTool('height'); break;
        case 'c': setTool('select'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, setBrushSize, undo, redo]);

  return (
    <div style={styles.root}>
      <MenuBar />
      <div style={styles.body}>
        <ToolBar />
        <div style={styles.canvas}>
          <PixelCanvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};
