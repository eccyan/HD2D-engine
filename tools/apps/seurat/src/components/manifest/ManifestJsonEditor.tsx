import React, { useState, useEffect } from 'react';
import { useSeuratStore } from '../../store/useSeuratStore.js';

export function ManifestJsonEditor() {
  const manifest = useSeuratStore((s) => s.manifest);
  const saveManifest = useSeuratStore((s) => s.saveManifest);
  const [json, setJson] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (manifest) setJson(JSON.stringify(manifest, null, 2));
  }, [manifest]);

  if (!manifest) return null;

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(json);
      useSeuratStore.setState({ manifest: parsed });
      setSaving(true);
      await saveManifest();
      setSaving(false);
      setEditing(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.sectionTitle}>Raw JSON</span>
        {!editing && (
          <button onClick={() => setEditing(true)} style={styles.editBtn}>Edit</button>
        )}
        {editing && (
          <>
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setJson(JSON.stringify(manifest, null, 2)); setError(''); }}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {error && <div style={styles.errorText}>{error}</div>}
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        readOnly={!editing}
        style={{
          ...styles.jsonEditor,
          background: editing ? '#1a1a30' : '#111120',
          borderColor: editing ? '#4a8af8' : '#2a2a3a',
        }}
        spellCheck={false}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
  },
  editBtn: {
    background: '#222236',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  saveBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 3,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: '#2a2a3a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 9,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#d88',
    marginBottom: 4,
  },
  jsonEditor: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ccc',
    border: '1px solid',
    borderRadius: 4,
    padding: 8,
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 200,
  },
};
