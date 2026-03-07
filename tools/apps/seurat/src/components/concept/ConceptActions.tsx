import React, { useRef, useState, useEffect } from 'react';
import type { ConceptArt } from '@vulkan-game-tools/asset-types';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { SAMPLER_NAMES } from '../../lib/ai-generate.js';

export function ConceptActions() {
  const manifest = useSeuratStore((s) => s.manifest);
  const saveConcept = useSeuratStore((s) => s.saveConcept);
  const aiConfig = useSeuratStore((s) => s.aiConfig);
  const conceptGenerating = useSeuratStore((s) => s.conceptGenerating);
  const conceptError = useSeuratStore((s) => s.conceptError);
  const generateConceptArt = useSeuratStore((s) => s.generateConceptArt);
  const uploadConceptImage = useSeuratStore((s) => s.uploadConceptImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [saving, setSaving] = useState(false);

  // Concept-specific generation settings (independent from sprite animation settings)
  const [conceptSteps, setConceptSteps] = useState(20);
  const [conceptCfg, setConceptCfg] = useState(10);
  const [conceptSampler, setConceptSampler] = useState('euler');
  const [conceptSeed, setConceptSeed] = useState(-1);
  const [conceptCheckpoint, setConceptCheckpoint] = useState('');
  const [conceptLoras, setConceptLoras] = useState<{ name: string; weight: number }[]>([]);

  // Sync ComfyUI URL and LoRA from main aiConfig but keep concept-specific cfg/steps
  useEffect(() => {
    setConceptSampler(aiConfig.sampler);
  }, [aiConfig.sampler]);

  useEffect(() => {
    if (!manifest) return;
    setDescription(manifest.concept.description);
    setStylePrompt(manifest.concept.style_prompt);
    setNegativePrompt(manifest.concept.negative_prompt);
  }, [manifest?.character_id]);

  if (!manifest) return null;

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
    const concept: ConceptArt = {
      ...manifest.concept,
      description,
      style_prompt: stylePrompt,
      negative_prompt: negativePrompt,
    };
    await saveConcept(concept);
    await generateConceptArt({
      steps: conceptSteps, cfg: conceptCfg, sampler: conceptSampler, seed: conceptSeed,
      loras: conceptLoras,
      checkpoint: conceptCheckpoint || undefined,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Concept Art</div>

      <label style={styles.label}>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={styles.textarea}
        placeholder="Describe the character..."
      />

      <label style={styles.label}>Style Prompt</label>
      <textarea
        value={stylePrompt}
        onChange={(e) => setStylePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        placeholder="pixel art, 128x128..."
      />

      <label style={styles.label}>Negative Prompt</label>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        placeholder="blurry, realistic..."
      />

      <div style={styles.actions}>
        <button onClick={() => handleSave()} disabled={saving} style={styles.saveBtn}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {!manifest.concept.approved && (
          <button onClick={() => handleSave(true)} disabled={saving} style={styles.approveBtn}>
            Approve
          </button>
        )}
      </div>

      <div style={styles.divider} />

      {/* Concept generation settings */}
      <div style={styles.settingsSection}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600, marginBottom: 2 }}>
          ComfyUI Settings (Concept)
        </div>
        <Row>
          <label style={styles.settingLabel}>Ckpt</label>
          <input
            value={conceptCheckpoint}
            onChange={(e) => setConceptCheckpoint(e.target.value)}
            style={{ ...styles.settingInput, flex: 1 }}
            placeholder={aiConfig.checkpoint || 'v1-5-pruned-emaonly.safetensors'}
          />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Steps</label>
          <input type="number" value={conceptSteps} onChange={(e) => setConceptSteps(parseInt(e.target.value) || 20)} style={{ ...styles.settingInput, width: 50 }} />
          <label style={styles.settingLabel}>CFG</label>
          <input type="number" value={conceptCfg} onChange={(e) => setConceptCfg(parseFloat(e.target.value) || 7)} style={{ ...styles.settingInput, width: 50 }} step={0.5} />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Seed</label>
          <input type="number" value={conceptSeed} onChange={(e) => setConceptSeed(parseInt(e.target.value))} style={{ ...styles.settingInput, width: 80 }} />
          <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>-1=rng</span>
        </Row>
        <Row>
          <label style={styles.settingLabel}>Sampler</label>
          <select value={conceptSampler} onChange={(e) => setConceptSampler(e.target.value)} style={styles.settingSelect}>
            {SAMPLER_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
        {/* LoRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600 }}>LoRA</span>
          <button
            onClick={() => setConceptLoras([...conceptLoras, { name: '', weight: 0.8 }])}
            style={styles.miniBtn}
          >
            +
          </button>
          {conceptLoras.length === 0 && (
            <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>none (add to apply)</span>
          )}
        </div>
        {conceptLoras.map((lora, i) => (
          <Row key={i}>
            <input
              value={lora.name}
              onChange={(e) => {
                const updated = [...conceptLoras];
                updated[i] = { ...updated[i], name: e.target.value };
                setConceptLoras(updated);
              }}
              style={{ ...styles.settingInput, flex: 1 }}
              placeholder="lora_name"
            />
            <input
              type="number"
              value={lora.weight}
              onChange={(e) => {
                const updated = [...conceptLoras];
                updated[i] = { ...updated[i], weight: parseFloat(e.target.value) || 0 };
                setConceptLoras(updated);
              }}
              style={{ ...styles.settingInput, width: 55 }}
              step={0.1}
              min={0}
              max={2}
            />
            <button
              onClick={() => setConceptLoras(conceptLoras.filter((_, j) => j !== i))}
              style={styles.miniBtn}
            >
              x
            </button>
          </Row>
        ))}
      </div>

      <div style={styles.buttonRow}>
        <button
          onClick={handleGenerate}
          disabled={conceptGenerating || (!description && !stylePrompt)}
          style={{
            ...styles.generateBtn,
            opacity: conceptGenerating || (!description && !stylePrompt) ? 0.5 : 1,
          }}
        >
          {conceptGenerating ? 'Generating...' : 'Generate via AI'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={conceptGenerating}
          style={styles.uploadBtn}
        >
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadConceptImage(file);
              e.target.value = '';
            }
          }}
        />
      </div>

      {conceptGenerating && (
        <div style={styles.progressText}>
          {conceptError?.includes('retrying') ? conceptError : 'Sending to ComfyUI...'}
        </div>
      )}
      {conceptError && !conceptError.includes('retrying') && (
        <div style={styles.errorText}>{conceptError}</div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  textarea: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 8px',
    resize: 'vertical' as const,
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
  },
  saveBtn: {
    flex: 1,
    background: '#1e3a6e',
    border: '1px solid #4a8af8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '6px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  approveBtn: {
    flex: 1,
    background: '#1e3a2e',
    border: '1px solid #44aa44',
    borderRadius: 4,
    color: '#70d870',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '6px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  divider: {
    height: 1,
    background: '#2a2a3a',
    margin: '8px 0',
  },
  buttonRow: {
    display: 'flex',
    gap: 6,
  },
  generateBtn: {
    flex: 1,
    background: '#3a1e6e',
    border: '1px solid #8a4af8',
    borderRadius: 4,
    color: '#b890f8',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '8px 8px',
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'center',
  },
  uploadBtn: {
    flex: 1,
    background: '#1e3a3a',
    border: '1px solid #4ac8c8',
    borderRadius: 4,
    color: '#90d8d8',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '8px 8px',
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'center',
  },
  progressText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#8a4af8',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#d88',
    background: '#2a1515',
    border: '1px solid #553333',
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
  settingsSection: {
    background: '#131324',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 6,
  },
  settingLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#666',
    minWidth: 40,
  },
  settingInput: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: 3,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 6px',
    outline: 'none',
  },
  miniBtn: {
    background: '#2a2a3a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 8,
    padding: '1px 6px',
    cursor: 'pointer',
  },
  settingSelect: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: 3,
    color: '#ddd',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 6px',
    outline: 'none',
  },
};
