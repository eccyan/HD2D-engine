import React from 'react';
import type { FrameStatus } from '@vulkan-game-tools/asset-types';
import { useSeuratStore } from '../../store/useSeuratStore.js';

const FILTER_OPTIONS: Array<{ value: FrameStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'generated', label: 'Generated' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function ReviewActions() {
  const reviewFilter = useSeuratStore((s) => s.reviewFilter);
  const setReviewFilter = useSeuratStore((s) => s.setReviewFilter);
  const batchApproveGenerated = useSeuratStore((s) => s.batchApproveGenerated);

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Review</div>

      <div style={styles.section}>
        <div style={styles.subTitle}>Filter</div>
        <div style={styles.filterRow}>
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setReviewFilter(value)}
              style={{
                ...styles.filterBtn,
                background: reviewFilter === value ? '#1e2a42' : 'transparent',
                borderColor: reviewFilter === value ? '#4a8af8' : '#333',
                color: reviewFilter === value ? '#90b8f8' : '#666',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={batchApproveGenerated} style={styles.batchBtn}>
        Approve All Generated
      </button>
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
  subTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#777',
    fontWeight: 600,
  },
  filterRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterBtn: {
    border: '1px solid',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '3px 8px',
    cursor: 'pointer',
    background: 'transparent',
  },
  batchBtn: {
    background: '#1e3a2e',
    border: '1px solid #44aa44',
    borderRadius: 4,
    color: '#70d870',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '6px 12px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};
