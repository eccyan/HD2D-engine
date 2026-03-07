import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';

export function ConceptPreview() {
  const manifest = useSeuratStore((s) => s.manifest);
  const conceptImageUrl = useSeuratStore((s) => s.conceptImageUrl);
  const [imgError, setImgError] = useState(false);

  if (!manifest) {
    return (
      <div style={styles.empty}>Select a character to view concept art.</div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Concept Art</span>
        {manifest.concept.approved && (
          <span style={styles.approvedBadge}>Approved</span>
        )}
      </div>
      <div style={styles.imageBox}>
        {conceptImageUrl && !imgError ? (
          <img
            src={conceptImageUrl}
            alt="Concept art"
            style={styles.img}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={styles.placeholder}>No concept art yet</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowY: 'auto',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 700,
    color: '#ccc',
  },
  approvedBadge: {
    fontSize: 10,
    color: '#44aa44',
    border: '1px solid #44aa44',
    padding: '2px 8px',
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  imageBox: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: '1',
    background: '#0e0e1a',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated' as const,
  },
  placeholder: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    padding: 16,
  },
};
