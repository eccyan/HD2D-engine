import React from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { ManifestStatsView } from '../manifest/ManifestStatsView.js';
import { ConceptPreview } from '../concept/ConceptPreview.js';
import { AnimationMainView } from '../animate/AnimationMainView.js';

export function MainPane() {
  const treeSelection = useSeuratStore((s) => s.treeSelection);

  switch (treeSelection.kind) {
    case 'manifest':
      return <ManifestStatsView />;
    case 'character':
      return <ConceptPreview />;
    case 'animation':
      return (
        <AnimationMainView
          key={`${treeSelection.characterId}-${treeSelection.animName}`}
          animName={treeSelection.animName}
        />
      );
  }
}
