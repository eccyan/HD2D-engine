import React, { useState } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import type { RecentProject } from '../../store/types.js';

type Tab = 'new' | 'open' | 'recent';

interface Props {
  onClose: () => void;
}

export function ProjectDialog({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('new');
  const [name, setName] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useSeuratStore((s) => s.createProject);
  const openProject = useSeuratStore((s) => s.openProject);
  const recentProjects = useSeuratStore((s) => s.recentProjects);

  const handleCreate = async () => {
    if (!dirPath.trim() || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createProject(dirPath.trim(), name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  const handleOpen = async () => {
    if (!dirPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await openProject(dirPath.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  const handleRecent = async (r: RecentProject) => {
    setLoading(true);
    setError(null);
    try {
      await openProject(r.path);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Project</span>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        <div style={styles.tabs}>
          {(['new', 'open', 'recent'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...styles.tab,
                borderBottom: tab === t ? '2px solid #4a8af8' : '2px solid transparent',
                color: tab === t ? '#90b8f8' : '#888',
              }}
            >
              {t === 'new' ? 'New' : t === 'open' ? 'Open' : 'Recent'}
            </button>
          ))}
        </div>

        <div style={styles.body}>
          {tab === 'new' && (
            <>
              <label style={styles.label}>Project Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Game Sprites"
                style={styles.input}
                autoFocus
              />
              <label style={styles.label}>Directory Path</label>
              <input
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                placeholder="/Users/me/projects/my-sprites"
                style={styles.input}
              />
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim() || !dirPath.trim()}
                style={styles.primaryBtn}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </>
          )}

          {tab === 'open' && (
            <>
              <label style={styles.label}>Project Directory</label>
              <input
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                placeholder="/Users/me/projects/my-sprites"
                style={styles.input}
                autoFocus
              />
              <button
                onClick={handleOpen}
                disabled={loading || !dirPath.trim()}
                style={styles.primaryBtn}
              >
                {loading ? 'Opening...' : 'Open Project'}
              </button>
            </>
          )}

          {tab === 'recent' && (
            <div style={styles.recentList}>
              {recentProjects.length === 0 && (
                <span style={styles.emptyText}>No recent projects</span>
              )}
              {recentProjects.map((r) => (
                <button
                  key={r.path}
                  onClick={() => handleRecent(r)}
                  disabled={loading}
                  style={styles.recentItem}
                >
                  <span style={styles.recentName}>{r.name}</span>
                  <span style={styles.recentPath}>{r.path}</span>
                </button>
              ))}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#1a1a2a',
    border: '1px solid #3a3a5a',
    borderRadius: 8,
    width: 460,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a3a',
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#ddd',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #2a2a3a',
  },
  tab: {
    flex: 1,
    background: 'none',
    border: 'none',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 0',
    cursor: 'pointer',
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  input: {
    background: '#111120',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
  },
  primaryBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 16px',
    cursor: 'pointer',
    marginTop: 8,
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 300,
    overflowY: 'auto',
  },
  recentItem: {
    background: '#111120',
    border: '1px solid #2a2a3a',
    borderRadius: 4,
    padding: '8px 10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    textAlign: 'left',
  },
  recentName: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ddd',
    fontWeight: 600,
  },
  recentPath: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
  },
  emptyText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#f88',
    background: '#2a1a1a',
    border: '1px solid #5a2a2a',
    borderRadius: 4,
    padding: '6px 10px',
    marginTop: 4,
  },
};
