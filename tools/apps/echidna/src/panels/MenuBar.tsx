import React, { useRef } from 'react';
import { useCharacterStore } from '../store/useCharacterStore.js';
import { exportPly } from '../lib/plyExport.js';
import { parseVox } from '../lib/voxImport.js';
import type { EchidnaFile } from '../store/types.js';

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: 36,
    background: '#16162a',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 4,
  },
  btn: {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 4,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 13,
  },
  title: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#666',
  },
};

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function MenuBar() {
  const loadRef = useRef<HTMLInputElement>(null);
  const voxRef = useRef<HTMLInputElement>(null);

  const handleNew = () => {
    if (!confirm('Create new character? Unsaved changes will be lost.')) return;
    useCharacterStore.getState().newCharacter();
  };

  const handleSave = () => {
    const data = useCharacterStore.getState().saveProject();
    const json = JSON.stringify(data, null, 2);
    const name = data.characterName.replace(/\s+/g, '_').toLowerCase() || 'character';
    download(new Blob([json], { type: 'application/json' }), `${name}.echidna`);
  };

  const handleLoad = () => {
    loadRef.current?.click();
  };

  const handleLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result as string) as EchidnaFile;
      useCharacterStore.getState().loadProject(data);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportVox = () => {
    voxRef.current?.click();
  };

  const handleVoxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const voxFile = parseVox(buffer);
    const models = voxFile.models.map((m, i) => ({
      name: `part_${i}`,
      voxels: m.voxels,
    }));
    useCharacterStore.getState().importVoxModels(models);
    e.target.value = '';
  };

  const handleExportPly = () => {
    const s = useCharacterStore.getState();
    const blob = exportPly(s.voxels, s.gridWidth, s.gridDepth, s.characterParts);
    const name = s.characterName.replace(/\s+/g, '_').toLowerCase() || 'character';
    download(blob, `${name}.ply`);
  };

  return (
    <div style={styles.bar}>
      <button style={styles.btn} onClick={handleNew}>New</button>
      <button style={styles.btn} onClick={handleSave}>Save</button>
      <button style={styles.btn} onClick={handleLoad}>Load</button>
      <button style={styles.btn} onClick={handleImportVox}>Import .vox</button>
      <button style={styles.btn} onClick={handleExportPly}>Export PLY</button>
      <input ref={loadRef} type="file" accept=".echidna,.json" style={{ display: 'none' }} onChange={handleLoadChange} />
      <input ref={voxRef} type="file" accept=".vox" style={{ display: 'none' }} onChange={handleVoxChange} />
      <span style={styles.title}>Echidna</span>
    </div>
  );
}
