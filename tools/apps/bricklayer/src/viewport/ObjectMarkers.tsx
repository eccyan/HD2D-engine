import React from 'react';
import { useSceneStore } from '../store/useSceneStore.js';

export function ObjectMarkers() {
  const placedObjects = useSceneStore((s) => s.placedObjects);
  const showGizmos = useSceneStore((s) => s.showGizmos);
  const setSelectedEntity = useSceneStore((s) => s.setSelectedEntity);
  const setInspectorTab = useSceneStore((s) => s.setInspectorTab);

  if (!showGizmos) return null;

  return (
    <group>
      {placedObjects.map((obj) => (
        <mesh
          key={obj.id}
          position={[obj.position[0], obj.position[1], obj.position[2]]}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntity({ type: 'object', id: obj.id });
            setInspectorTab('objects');
          }}
        >
          <boxGeometry args={[obj.scale, obj.scale, obj.scale]} />
          <meshBasicMaterial
            color={obj.is_static ? '#00bcd4' : '#ff9800'}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
