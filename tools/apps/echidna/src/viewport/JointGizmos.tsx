import React, { useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useCharacterStore } from '../store/useCharacterStore.js';

export function JointGizmos() {
  const characterParts = useCharacterStore((s) => s.characterParts);
  const selectedPart = useCharacterStore((s) => s.selectedPart);
  const showGizmos = useCharacterStore((s) => s.showGizmos);
  const setSelectedPart = useCharacterStore((s) => s.setSelectedPart);

  const handleClick = useCallback((partId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedPart(partId);
  }, [setSelectedPart]);

  if (!showGizmos || characterParts.length === 0) return null;

  // Build a map from part id to part for quick lookup
  const partMap = new Map(characterParts.map((p) => [p.id, p]));

  return (
    <group>
      {characterParts.map((part) => {
        const isSelected = part.id === selectedPart;
        const [jx, jy, jz] = part.joint;

        // Line to parent joint
        let line = null;
        if (part.parent) {
          const parent = partMap.get(part.parent);
          if (parent) {
            const [px, py, pz] = parent.joint;
            line = (
              <Line
                points={[[jx, jy, jz], [px, py, pz]]}
                color="#ffffff"
                lineWidth={1}
              />
            );
          }
        }

        return (
          <React.Fragment key={part.id}>
            {line}
            <mesh
              position={[jx, jy, jz]}
              onClick={handleClick(part.id)}
            >
              <sphereGeometry args={[0.3, 12, 12]} />
              <meshStandardMaterial
                color={isSelected ? '#ffcc00' : '#ffffff'}
                emissive={isSelected ? '#ffcc00' : '#444444'}
                emissiveIntensity={isSelected ? 0.5 : 0.2}
              />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
}
