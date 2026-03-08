import React from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';

interface Props {
  animName: string;
}

export function ReviewActions({ animName }: Props) {
  const manifest = useSeuratStore((s) => s.manifest);

  if (!manifest) return null;

  const anim = manifest.animations.find((a) => a.name === animName);
  if (!anim) return null;

  const total = anim.frames.length;
  const counts = {
    pending: anim.frames.filter((f) => f.status === 'pending').length,
    generated: anim.frames.filter((f) => f.status === 'generated').length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Review</div>

      <div style={styles.section}>
        <div style={styles.statusRow}>
          {counts.pending > 0 && <span style={{ color: '#666' }}>{counts.pending} pending</span>}
          {counts.generated > 0 && <span style={{ color: '#aa8800' }}>{counts.generated} generated</span>}
          <span style={{ color: '#555' }}>{total} total</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
  },
  section: {
    background: '#131324',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statusRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    fontFamily: 'monospace',
    fontSize: 9,
  },
};
