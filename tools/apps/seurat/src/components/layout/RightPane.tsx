import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { ManifestJsonEditor } from '../manifest/ManifestJsonEditor.js';
import { ConceptActions } from '../concept/ConceptActions.js';
import { ChibiActions } from '../concept/ChibiActions.js';
import { PixelActions } from '../concept/PixelActions.js';
import { AtlasActions } from '../atlas/AtlasActions.js';
import { GenerateActions } from '../generate/GenerateActions.js';
import { ReviewActions } from '../review/ReviewActions.js';

export function RightPane() {
  const treeSelection = useSeuratStore((s) => s.treeSelection);

  return (
    <div style={styles.pane}>
      <RightContent selection={treeSelection} />
    </div>
  );
}

function RightContent({ selection }: { selection: ReturnType<typeof useSeuratStore.getState>['treeSelection'] }) {
  switch (selection.kind) {
    case 'manifest':
      return <ManifestJsonEditor />;
    case 'character':
      return (
        <>
          <ConceptActions />
          <div style={styles.divider} />
          <ChibiActions />
          <div style={styles.divider} />
          <PixelActions />
          <div style={styles.divider} />
          <SpriteGenerationSection />
          <AtlasActions />
        </>
      );
    case 'animation':
      return (
        <>
          <GenerateActions animName={selection.animName} />
          <div style={styles.divider} />
          <ReviewActions animName={selection.animName} />
        </>
      );
  }
}

function SpriteGenerationSection() {
  const manifest = useSeuratStore((s) => s.manifest);
  const generateFrames = useSeuratStore((s) => s.generateFrames);
  const generationJobs = useSeuratStore((s) => s.generationJobs);
  const clearCompletedJobs = useSeuratStore((s) => s.clearCompletedJobs);
  const [generatingAll, setGeneratingAll] = useState(false);

  if (!manifest) return null;

  const pendingCount = manifest.animations.reduce(
    (s, a) => s + a.frames.filter((f) => f.status === 'pending').length,
    0,
  );

  // Gating: require pixel approval, or backwards compat (concept approved + no chibi)
  const pixelApproved = manifest.pixel?.approved === true;
  const backwardsCompat = manifest.concept.approved && manifest.chibi === undefined;
  const enabled = pixelApproved || backwardsCompat;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={styles.sectionTitle}>Sprite Generation</div>
      {!enabled && (
        <div style={styles.disabledMsg}>
          Complete the pipeline (concept → chibi → pixel) and approve pixel art to enable frame generation.
        </div>
      )}
      <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#888', marginBottom: 4 }}>
        Generate all pending animation frames ({pendingCount} pending across {manifest.animations.length} animations)
      </div>
      <button
        onClick={async () => {
          setGeneratingAll(true);
          try { await generateFrames('all_pending'); } finally { setGeneratingAll(false); }
        }}
        disabled={generatingAll || pendingCount === 0 || !enabled}
        style={{ ...styles.generateAllBtn, opacity: generatingAll || pendingCount === 0 || !enabled ? 0.5 : 1 }}
      >
        {generatingAll ? 'Generating...' : `Generate All Animations (${pendingCount})`}
      </button>

      {generationJobs.length > 0 && (
        <div style={styles.jobsSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600 }}>Jobs</span>
            <button onClick={clearCompletedJobs} style={styles.clearJobsBtn}>Clear</button>
          </div>
          {generationJobs.map((job) => (
            <div key={job.id} style={styles.jobRow}>
              <span style={{ color: job.status === 'error' ? '#d88' : job.status === 'done' ? '#8d8' : '#aa8' }}>
                [{job.status}]
              </span>
              <span>{job.animName}{job.frameIndex >= 0 ? `/f${job.frameIndex}` : ''}</span>
              {job.error && <span style={{ color: '#d88', fontSize: 8 }}>{job.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pane: {
    width: 300,
    flexShrink: 0,
    background: '#111120',
    borderLeft: '1px solid #2a2a3a',
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  divider: {
    height: 1,
    background: '#2a2a3a',
    margin: '8px 0',
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
    marginBottom: 4,
  },
  disabledMsg: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#886',
    background: '#2a2a1a',
    border: '1px solid #554422',
    borderRadius: 4,
    padding: '4px 6px',
  },
  generateAllBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  jobsSection: {
    background: '#131324',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    marginTop: 4,
  },
  clearJobsBtn: {
    background: '#2a2a3a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 8,
    padding: '1px 6px',
    cursor: 'pointer',
  },
  jobRow: {
    display: 'flex',
    gap: 6,
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#aaa',
    padding: '1px 0',
  },
};
