import React, { useState } from 'react';
import { useSceneStore } from '../store/useSceneStore.js';
import type { BodyPart } from '../store/types.js';
import { parseVox } from '../lib/voxImport.js';

const styles: Record<string, React.CSSProperties> = {
  section: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 1 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, padding: '4px 6px', background: '#2a2a4a', border: '1px solid #444',
    borderRadius: 4, color: '#ddd', fontSize: 13,
  },
  btn: {
    padding: '4px 10px', border: '1px solid #555', borderRadius: 4,
    background: '#3a3a6a', color: '#ddd', cursor: 'pointer', fontSize: 12,
  },
  btnDanger: {
    padding: '4px 10px', border: '1px solid #844', borderRadius: 4,
    background: '#4a2a2a', color: '#ddd', cursor: 'pointer', fontSize: 12,
  },
  partItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  },
  partSelected: { background: '#3a3a6a' },
  numInput: {
    width: 50, padding: '2px 4px', background: '#2a2a4a', border: '1px solid #444',
    borderRadius: 4, color: '#ddd', fontSize: 12, textAlign: 'center' as const,
  },
  poseItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 8px', borderRadius: 4, fontSize: 12,
  },
  poseSelected: { background: '#3a3a6a' },
};

function PartTree({ parts, parentId, depth, selected, onSelect }: {
  parts: BodyPart[];
  parentId: string | null;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const children = parts.filter((p) => p.parent === parentId);
  return (
    <>
      {children.map((part) => (
        <React.Fragment key={part.id}>
          <div
            style={{
              ...styles.partItem,
              paddingLeft: 8 + depth * 16,
              ...(selected === part.id ? styles.partSelected : {}),
            }}
            onClick={() => onSelect(part.id)}
          >
            <span style={{ color: '#ddd' }}>{part.id}</span>
            <span style={{ color: '#666', fontSize: 10 }}>
              {part.parent ? '' : '(root)'}
            </span>
          </div>
          <PartTree
            parts={parts}
            parentId={part.id}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export function CharacterTab() {
  const characterMode = useSceneStore((s) => s.characterMode);
  const setCharacterMode = useSceneStore((s) => s.setCharacterMode);
  const characterName = useSceneStore((s) => s.characterName);
  const setCharacterName = useSceneStore((s) => s.setCharacterName);
  const parts = useSceneStore((s) => s.characterParts);
  const selectedPart = useSceneStore((s) => s.selectedPart);
  const setSelectedPart = useSceneStore((s) => s.setSelectedPart);
  const addPart = useSceneStore((s) => s.addPart);
  const removePart = useSceneStore((s) => s.removePart);
  const updatePartJoint = useSceneStore((s) => s.updatePartJoint);
  const setPartParent = useSceneStore((s) => s.setPartParent);
  const poses = useSceneStore((s) => s.characterPoses);
  const selectedPose = useSceneStore((s) => s.selectedPose);
  const setSelectedPose = useSceneStore((s) => s.setSelectedPose);
  const addPose = useSceneStore((s) => s.addPose);
  const removePose = useSceneStore((s) => s.removePose);
  const updatePoseRotation = useSceneStore((s) => s.updatePoseRotation);
  const previewPose = useSceneStore((s) => s.previewPose);
  const setPreviewPose = useSceneStore((s) => s.setPreviewPose);
  const importVoxModels = useSceneStore((s) => s.importVoxModels);

  const [newPartName, setNewPartName] = useState('');
  const [newPoseName, setNewPoseName] = useState('');

  const currentPart = parts.find((p) => p.id === selectedPart) ?? null;
  const currentPose = selectedPose ? poses[selectedPose] : null;

  const handleImportVox = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vox';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const voxFile = parseVox(buffer);
      const models = voxFile.models.map((m, i) => ({
        name: `part_${i}`,
        voxels: m.voxels,
      }));
      importVoxModels(models);
    };
    input.click();
  };

  return (
    <div>
      {/* Mode toggle */}
      <div style={styles.section}>
        <div style={styles.row}>
          <label style={{ color: '#ddd', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={characterMode}
              onChange={(e) => setCharacterMode(e.target.checked)}
            />
            {' '}Character Mode
          </label>
        </div>
        {characterMode && (
          <div style={styles.row}>
            <span style={{ color: '#888', fontSize: 11 }}>Name:</span>
            <input
              style={styles.input}
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="character name"
            />
          </div>
        )}
      </div>

      {characterMode && (
        <>
          {/* Import */}
          <div style={styles.section}>
            <button style={styles.btn} onClick={handleImportVox}>
              Import .vox
            </button>
          </div>

          {/* Parts tree */}
          <div style={styles.section}>
            <div style={styles.label}>Parts</div>
            <div style={{ border: '1px solid #333', borderRadius: 4, padding: 4, maxHeight: 200, overflowY: 'auto' }}>
              {parts.length === 0 ? (
                <div style={{ color: '#666', fontSize: 11, padding: 4 }}>No parts defined</div>
              ) : (
                <PartTree
                  parts={parts}
                  parentId={null}
                  depth={0}
                  selected={selectedPart}
                  onSelect={setSelectedPart}
                />
              )}
            </div>
            <div style={styles.row}>
              <input
                style={styles.input}
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="part name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPartName.trim()) {
                    addPart(newPartName.trim());
                    setNewPartName('');
                  }
                }}
              />
              <button
                style={styles.btn}
                onClick={() => {
                  if (newPartName.trim()) {
                    addPart(newPartName.trim());
                    setNewPartName('');
                  }
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Selected part editor */}
          {currentPart && (
            <div style={styles.section}>
              <div style={styles.label}>Part: {currentPart.id}</div>

              <div style={styles.row}>
                <span style={{ color: '#888', fontSize: 11, width: 40 }}>Parent:</span>
                <select
                  style={{ ...styles.input, flex: 1 }}
                  value={currentPart.parent ?? ''}
                  onChange={(e) => setPartParent(currentPart.id, e.target.value || null)}
                >
                  <option value="">(root)</option>
                  {parts
                    .filter((p) => p.id !== currentPart.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.id}</option>
                    ))}
                </select>
              </div>

              <div style={styles.row}>
                <span style={{ color: '#888', fontSize: 11, width: 40 }}>Joint:</span>
                {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                  <React.Fragment key={axis}>
                    <span style={{ color: '#666', fontSize: 10 }}>{axis}</span>
                    <input
                      type="number"
                      style={styles.numInput}
                      value={currentPart.joint[i]}
                      onChange={(e) => {
                        const j: [number, number, number] = [...currentPart.joint];
                        j[i] = Number(e.target.value);
                        updatePartJoint(currentPart.id, j);
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>

              <div style={{ color: '#666', fontSize: 10 }}>
                {currentPart.voxelKeys.length} voxels assigned
              </div>

              <button
                style={styles.btnDanger}
                onClick={() => removePart(currentPart.id)}
              >
                Delete Part
              </button>
            </div>
          )}

          {/* Poses */}
          <div style={styles.section}>
            <div style={styles.label}>Poses</div>
            <div style={{ border: '1px solid #333', borderRadius: 4, padding: 4, maxHeight: 150, overflowY: 'auto' }}>
              {Object.keys(poses).length === 0 ? (
                <div style={{ color: '#666', fontSize: 11, padding: 4 }}>No poses defined</div>
              ) : (
                Object.keys(poses).map((name) => (
                  <div
                    key={name}
                    style={{
                      ...styles.poseItem,
                      ...(selectedPose === name ? styles.poseSelected : {}),
                    }}
                  >
                    <span
                      style={{ color: '#ddd', cursor: 'pointer', flex: 1 }}
                      onClick={() => setSelectedPose(name)}
                    >
                      {name}
                    </span>
                    <button
                      style={{ ...styles.btnDanger, padding: '2px 6px', fontSize: 10 }}
                      onClick={() => removePose(name)}
                    >
                      X
                    </button>
                  </div>
                ))
              )}
            </div>
            <div style={styles.row}>
              <input
                style={styles.input}
                value={newPoseName}
                onChange={(e) => setNewPoseName(e.target.value)}
                placeholder="pose name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPoseName.trim()) {
                    addPose(newPoseName.trim());
                    setNewPoseName('');
                  }
                }}
              />
              <button
                style={styles.btn}
                onClick={() => {
                  if (newPoseName.trim()) {
                    addPose(newPoseName.trim());
                    setNewPoseName('');
                  }
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Pose editor */}
          {currentPose && selectedPose && (
            <div style={styles.section}>
              <div style={styles.label}>Pose: {selectedPose}</div>
              <div style={styles.row}>
                <label style={{ color: '#ddd', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={previewPose}
                    onChange={(e) => setPreviewPose(e.target.checked)}
                  />
                  {' '}Preview
                </label>
              </div>
              {parts.map((part) => {
                const rot = currentPose.rotations[part.id] ?? [0, 0, 0];
                return (
                  <div key={part.id} style={{ marginBottom: 4 }}>
                    <div style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>{part.id}</div>
                    <div style={styles.row}>
                      {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                        <React.Fragment key={axis}>
                          <span style={{ color: '#666', fontSize: 10 }}>{axis}</span>
                          <input
                            type="number"
                            style={styles.numInput}
                            value={rot[i]}
                            onChange={(e) => {
                              const r: [number, number, number] = [...rot];
                              r[i] = Number(e.target.value);
                              updatePoseRotation(selectedPose, part.id, r);
                            }}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
