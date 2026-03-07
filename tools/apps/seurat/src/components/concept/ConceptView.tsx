import React, { useState, useEffect } from 'react';
import type { ConceptArt } from '@vulkan-game-tools/asset-types';
import { useSeuratStore } from '../../store/useSeuratStore.js';

export function ConceptView() {
  const manifest = useSeuratStore((s) => s.manifest);
  const saveConcept = useSeuratStore((s) => s.saveConcept);
  const conceptImageUrl = useSeuratStore((s) => s.conceptImageUrl);
  const conceptGenerating = useSeuratStore((s) => s.conceptGenerating);
  const conceptError = useSeuratStore((s) => s.conceptError);
  const generateConceptArt = useSeuratStore((s) => s.generateConceptArt);

  const [description, setDescription] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!manifest) return;
    setDescription(manifest.concept.description);
    setStylePrompt(manifest.concept.style_prompt);
    setNegativePrompt(manifest.concept.negative_prompt);
    setImgError(false);
  }, [manifest?.character_id]);

  if (!manifest) return <EmptyState />;

  const handleSave = async (approved?: boolean) => {
    setSaving(true);
    const concept: ConceptArt = {
      ...manifest.concept,
      description,
      style_prompt: stylePrompt,
      negative_prompt: negativePrompt,
      approved: approved ?? manifest.concept.approved,
    };
    await saveConcept(concept);
    setSaving(false);
  };

  const handleGenerate = async () => {
    // Save current prompts first so generation uses latest values
    const concept: ConceptArt = {
      ...manifest.concept,
      description,
      style_prompt: stylePrompt,
      negative_prompt: negativePrompt,
    };
    await saveConcept(concept);
    setImgError(false);
    await generateConceptArt();
  };

  return (
    <div style={styles.container} data-testid="concept-view">
      <div style={styles.header}>
        <span style={styles.title}>Concept Art</span>
        {manifest.concept.approved && (
          <span style={styles.approvedBadge} data-testid="concept-approved-badge">Approved</span>
        )}
      </div>

      <div style={styles.columns}>
        {/* Left: form */}
        <div style={styles.form}>
          <label style={styles.label}>Character Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={styles.textarea}
            placeholder="Describe the character: appearance, gear, personality..."
            data-testid="concept-description"
          />

          <label style={styles.label}>Style Prompt (prepended to all AI generation)</label>
          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            rows={3}
            style={styles.textarea}
            placeholder="pixel art, 128x128, medieval fantasy, low-res..."
            data-testid="concept-style-prompt"
          />

          <label style={styles.label}>Negative Prompt</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={2}
            style={styles.textarea}
            placeholder="blurry, realistic, 3d render..."
            data-testid="concept-negative-prompt"
          />

          <div style={styles.actions}>
            <button onClick={() => handleSave()} disabled={saving} style={styles.saveBtn} data-testid="concept-save-btn">
              {saving ? 'Saving...' : 'Save Concept'}
            </button>
            {!manifest.concept.approved && (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={styles.approveBtn}
                data-testid="concept-approve-btn"
              >
                Approve Concept
              </button>
            )}
          </div>
        </div>

        {/* Right: image preview + generate */}
        <div style={styles.imagePanel}>
          <div style={styles.imageBox}>
            {conceptImageUrl && !imgError ? (
              <img
                src={conceptImageUrl}
                alt="Concept art"
                style={styles.conceptImg}
                onError={() => setImgError(true)}
                data-testid="concept-image"
              />
            ) : (
              <div style={styles.imagePlaceholder} data-testid="concept-image-placeholder">
                {imgError ? 'No concept art yet' : 'No concept art yet'}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={conceptGenerating || (!description && !stylePrompt)}
            style={{
              ...styles.generateBtn,
              opacity: conceptGenerating || (!description && !stylePrompt) ? 0.5 : 1,
            }}
            data-testid="concept-generate-btn"
          >
            {conceptGenerating ? 'Generating...' : 'Generate Concept Art'}
          </button>

          {conceptGenerating && (
            <div style={styles.progressText}>
              Sending to ComfyUI... This may take a minute.
            </div>
          )}

          {conceptError && (
            <div style={styles.errorText} data-testid="concept-error">
              {conceptError}
            </div>
          )}

          <div style={styles.hint}>
            Generates a 512×512 full-body reference image using your description and style prompt via ComfyUI.
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#555', fontFamily: 'monospace', fontSize: 12 }}>
      Select a character from the Dashboard to edit its concept.
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
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
  columns: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  form: {
    flex: 1,
    minWidth: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
    marginTop: 8,
  },
  textarea: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '8px 10px',
    resize: 'vertical' as const,
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  saveBtn: {
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 20px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  approveBtn: {
    background: '#1e3a2e',
    border: '1px solid #44aa44',
    borderRadius: 4,
    color: '#70d870',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 20px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  imagePanel: {
    width: 280,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  imageBox: {
    width: 260,
    height: 260,
    background: '#0e0e1a',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated' as const,
  },
  imagePlaceholder: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    padding: 16,
  },
  generateBtn: {
    background: '#3a1e6e',
    border: '1px solid #8a4af8',
    borderRadius: 4,
    color: '#b890f8',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'center',
  },
  progressText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#8a4af8',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#d88',
    background: '#2a1515',
    border: '1px solid #553333',
    borderRadius: 4,
    padding: '6px 8px',
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    textAlign: 'center',
    lineHeight: 1.4,
  },
};
