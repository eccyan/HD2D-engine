import React from 'react';
import { useMapStore } from '../store/useMapStore.js';
import { Preview3D } from './Preview3D.js';

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '300px',
    background: '#16213e',
    borderLeft: '1px solid #333',
    overflowY: 'auto' as const,
  },
  section: { padding: '12px' },
  sectionTitle: { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, marginBottom: '8px', letterSpacing: '0.5px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' },
  label: { color: '#aaa' },
  value: { color: '#e0e0e0' },
  input: {
    width: '60px',
    padding: '2px 6px',
    border: '1px solid #555',
    background: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: '3px',
    fontSize: '12px',
    textAlign: 'right' as const,
  },
  slider: { width: '100%', marginTop: '4px' },
};

export const PropertiesPanel: React.FC = () => {
  const width = useMapStore(s => s.width);
  const height = useMapStore(s => s.height);
  const zoom = useMapStore(s => s.zoom);
  const previewCamera = useMapStore(s => s.previewCamera);
  const setZoom = useMapStore(s => s.setZoom);
  const setPreviewCamera = useMapStore(s => s.setPreviewCamera);

  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Map Info</div>
        <div style={styles.row}>
          <span style={styles.label}>Size</span>
          <span style={styles.value}>{width} x {height}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Zoom</span>
          <input
            type="range"
            min={1}
            max={64}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ width: '120px' }}
          />
          <span style={styles.value}>{zoom}x</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Camera</div>
        <div style={styles.row}>
          <span style={styles.label}>FOV</span>
          <input
            type="number"
            style={styles.input}
            value={previewCamera.fov}
            onChange={e => setPreviewCamera({ ...previewCamera, fov: Number(e.target.value) })}
          />
        </div>
        {(['position', 'target'] as const).map(field => (
          <div key={field}>
            <div style={{ ...styles.label, marginTop: '4px', marginBottom: '4px' }}>{field}</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <input
                  key={i}
                  type="number"
                  step={0.5}
                  style={styles.input}
                  value={previewCamera[field][i]}
                  onChange={e => {
                    const newVal = [...previewCamera[field]] as [number, number, number];
                    newVal[i] = Number(e.target.value);
                    setPreviewCamera({ ...previewCamera, [field]: newVal });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Preview3D />
    </div>
  );
};
