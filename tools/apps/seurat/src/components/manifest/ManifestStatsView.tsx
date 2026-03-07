import React from 'react';
import { useSeuratStore, getManifestStats } from '../../store/useSeuratStore.js';

export function ManifestStatsView() {
  const manifest = useSeuratStore((s) => s.manifest);

  if (!manifest) {
    return (
      <div style={styles.empty}>Select a character to view manifest.</div>
    );
  }

  const stats = getManifestStats(manifest);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Manifest</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Statistics</div>
        <div style={styles.statsGrid}>
          <StatItem label="Version" value={String(manifest.version)} />
          <StatItem label="Character ID" value={manifest.character_id} />
          <StatItem label="Display Name" value={manifest.display_name} />
          <StatItem label="Frame Size" value={`${manifest.spritesheet.frame_width}x${manifest.spritesheet.frame_height}`} />
          <StatItem label="Columns" value={String(manifest.spritesheet.columns)} />
          <StatItem label="Animations" value={String(manifest.animations.length)} />
          <StatItem label="Total Frames" value={String(stats.total)} />
          <StatItem label="Pending" value={String(stats.pending)} color="#aa8800" />
          <StatItem label="Generated" value={String(stats.generated)} color="#aa8800" />
          <StatItem label="Approved" value={String(stats.approved)} color="#44aa44" />
          <StatItem label="Rejected" value={String(stats.rejected)} color="#aa4444" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Spritesheet Config</div>
        <ConfigRow label="frame_width" value={String(manifest.spritesheet.frame_width)} />
        <ConfigRow label="frame_height" value={String(manifest.spritesheet.frame_height)} />
        <ConfigRow label="columns" value={String(manifest.spritesheet.columns)} />
        {manifest.atlas && (
          <>
            <ConfigRow label="atlas file" value={manifest.atlas.file} />
            <ConfigRow label="atlas size" value={`${manifest.atlas.width}x${manifest.atlas.height}`} />
          </>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '1px 0' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', minWidth: 90 }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: color ?? '#bbb' }}>{value}</span>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '1px 0' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', minWidth: 100 }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#bbb' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    maxWidth: 600,
    height: '100%',
    overflowY: 'auto',
  },
  empty: {
    padding: 24,
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 700,
    color: '#ccc',
    marginBottom: 16,
  },
  section: {
    background: '#131324',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
    fontWeight: 600,
    marginBottom: 8,
  },
  statsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
};
