import React, { useCallback } from 'react';
import { useMapStore } from '../store/useMapStore.js';
import { exportPly, exportSceneJson } from '../lib/plyExport.js';

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#0f3460',
    borderBottom: '1px solid #333',
    fontSize: '13px',
  },
  btn: {
    padding: '4px 12px',
    border: '1px solid #555',
    background: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  separator: { width: '1px', height: '20px', background: '#444', margin: '0 4px' },
  info: { color: '#888', fontSize: '11px', marginLeft: 'auto' },
  input: {
    width: '50px',
    padding: '2px 4px',
    border: '1px solid #555',
    background: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: '3px',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
};

export const MenuBar: React.FC = () => {
  const width = useMapStore(s => s.width);
  const height = useMapStore(s => s.height);
  const layers = useMapStore(s => s.layers);
  const heights = useMapStore(s => s.heights);
  const collisionGrid = useMapStore(s => s.collisionGrid);
  const previewCamera = useMapStore(s => s.previewCamera);
  const initMap = useMapStore(s => s.initMap);
  const resizeMap = useMapStore(s => s.resizeMap);
  const undo = useMapStore(s => s.undo);
  const redo = useMapStore(s => s.redo);
  const autoGenerateCollision = useMapStore(s => s.autoGenerateCollision);
  const activeLayer = useMapStore(s => s.activeLayer);
  const saveProject = useMapStore(s => s.saveProject);
  const loadProject = useMapStore(s => s.loadProject);
  const importImageToLayer = useMapStore(s => s.importImageToLayer);

  const handleNew = useCallback(() => {
    const w = Number(prompt('Width:', String(width))) || width;
    const h = Number(prompt('Height:', String(height))) || height;
    initMap(w, h);
  }, [width, height, initMap]);

  const handleResize = useCallback(() => {
    const w = Number(prompt('New width:', String(width))) || width;
    const h = Number(prompt('New height:', String(height))) || height;
    resizeMap(w, h);
  }, [width, height, resizeMap]);

  const handleExportPly = useCallback(() => {
    const buffer = exportPly(width, height, layers, heights);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.ply';
    a.click();
    URL.revokeObjectURL(url);
  }, [width, height, layers, heights]);

  const handleExportScene = useCallback(() => {
    const scene = exportSceneJson(
      'maps/map.ply',
      previewCamera,
      320, 240,
      width, height,
      collisionGrid,
    );
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [width, height, collisionGrid, previewCamera]);

  const handleSave = useCallback(() => {
    const json = saveProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.mapdata';
    a.click();
    URL.revokeObjectURL(url);
  }, [saveProject]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mapdata,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          loadProject(reader.result as string);
        } catch (e) {
          alert('Failed to load project: ' + (e as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadProject]);

  const handleImportImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        importImageToLayer(imageData);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    };
    input.click();
  }, [importImageToLayer]);

  const handleAutoCollision = useCallback(() => {
    const threshold = Number(prompt('Height threshold for collision:', '0.5')) || 0.5;
    autoGenerateCollision(threshold);
  }, [autoGenerateCollision]);

  return (
    <div style={styles.bar}>
      <button style={styles.btn} onClick={handleNew}>New</button>
      <button style={styles.btn} onClick={handleResize}>Resize</button>
      <button style={styles.btn} onClick={handleImportImage}>Import Image</button>
      <div style={styles.separator} />
      <button style={styles.btn} onClick={handleSave}>Save</button>
      <button style={styles.btn} onClick={handleLoad}>Load</button>
      <div style={styles.separator} />
      <button style={styles.btn} onClick={undo}>Undo</button>
      <button style={styles.btn} onClick={redo}>Redo</button>
      <div style={styles.separator} />
      <button style={styles.btn} onClick={handleExportPly}>Export PLY</button>
      <button style={styles.btn} onClick={handleExportScene}>Export Scene</button>
      <div style={styles.separator} />
      <button style={styles.btn} onClick={handleAutoCollision}>Auto Collision</button>
      <span style={styles.info}>{width} x {height}</span>
    </div>
  );
};
