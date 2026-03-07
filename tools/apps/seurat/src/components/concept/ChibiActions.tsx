import React, { useRef, useState, useEffect } from 'react';
import type { ChibiArt } from '@vulkan-game-tools/asset-types';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { SAMPLER_NAMES } from '../../lib/ai-generate.js';

export function ChibiActions() {
  const manifest = useSeuratStore((s) => s.manifest);
  const saveChibi = useSeuratStore((s) => s.saveChibi);
  const aiConfig = useSeuratStore((s) => s.aiConfig);
  const chibiGenerating = useSeuratStore((s) => s.chibiGenerating);
  const chibiError = useSeuratStore((s) => s.chibiError);
  const generateChibiArt = useSeuratStore((s) => s.generateChibiArt);
  const uploadChibiImage = useSeuratStore((s) => s.uploadChibiImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stylePrompt, setStylePrompt] = useState('chibi, super deformed, 2-3 head body ratio, cute, simple features');
  const [negativePrompt, setNegativePrompt] = useState('realistic, photograph, 3d render');
  const [saving, setSaving] = useState(false);

  const [chibiSteps, setChibiSteps] = useState(20);
  const [chibiCfg, setChibiCfg] = useState(10);
  const [chibiSampler, setChibiSampler] = useState('euler');
  const [chibiSeed, setChibiSeed] = useState(-1);
  const [chibiCheckpoint, setChibiCheckpoint] = useState('');
  const [chibiDenoise, setChibiDenoise] = useState(0.6);
  const [chibiLoras, setChibiLoras] = useState<{ name: string; weight: number }[]>([]);

  useEffect(() => {
    setChibiSampler(aiConfig.sampler);
  }, [aiConfig.sampler]);

  useEffect(() => {
    if (!manifest?.chibi) return;
    setStylePrompt(manifest.chibi.style_prompt);
    setNegativePrompt(manifest.chibi.negative_prompt);
  }, [manifest?.character_id]);

  if (!manifest) return null;

  const conceptApproved = manifest.concept.approved;
  const disabled = !conceptApproved;

  const handleSave = async (approved?: boolean) => {
    setSaving(true);
    const chibi: ChibiArt = {
      style_prompt: stylePrompt,
      negative_prompt: negativePrompt,
      reference_image: manifest.chibi?.reference_image || '',
      approved: approved ?? manifest.chibi?.approved ?? false,
    };
    await saveChibi(chibi);
    setSaving(false);
  };

  const handleGenerate = async () => {
    await handleSave();
    await generateChibiArt({
      steps: chibiSteps, cfg: chibiCfg, sampler: chibiSampler, seed: chibiSeed,
      loras: chibiLoras, checkpoint: chibiCheckpoint || undefined, denoise: chibiDenoise,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Chibi / Deformed</div>

      {disabled && (
        <div style={styles.disabledMsg}>Approve concept art first to enable chibi generation.</div>
      )}

      <label style={styles.label}>Style Prompt</label>
      <textarea
        value={stylePrompt}
        onChange={(e) => setStylePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        disabled={disabled}
        placeholder="chibi, super deformed..."
      />

      <label style={styles.label}>Negative Prompt</label>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        disabled={disabled}
        placeholder="realistic, photograph..."
      />

      <div style={styles.actions}>
        <button onClick={() => handleSave()} disabled={saving || disabled} style={styles.saveBtn}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {manifest.chibi?.reference_image && !manifest.chibi?.approved && (
          <button onClick={() => handleSave(true)} disabled={saving || disabled} style={styles.approveBtn}>
            Approve
          </button>
        )}
      </div>

      <div style={styles.divider} />

      <div style={styles.settingsSection}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600, marginBottom: 2 }}>
          ComfyUI Settings (Chibi)
        </div>
        <Row>
          <label style={styles.settingLabel}>Ckpt</label>
          <input
            value={chibiCheckpoint}
            onChange={(e) => setChibiCheckpoint(e.target.value)}
            style={{ ...styles.settingInput, flex: 1 }}
            placeholder={aiConfig.checkpoint || 'v1-5-pruned-emaonly.safetensors'}
            disabled={disabled}
          />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Steps</label>
          <input type="number" value={chibiSteps} onChange={(e) => setChibiSteps(parseInt(e.target.value) || 20)} style={{ ...styles.settingInput, width: 50 }} disabled={disabled} />
          <label style={styles.settingLabel}>CFG</label>
          <input type="number" value={chibiCfg} onChange={(e) => setChibiCfg(parseFloat(e.target.value) || 7)} style={{ ...styles.settingInput, width: 50 }} step={0.5} disabled={disabled} />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Seed</label>
          <input type="number" value={chibiSeed} onChange={(e) => setChibiSeed(parseInt(e.target.value))} style={{ ...styles.settingInput, width: 80 }} disabled={disabled} />
          <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>-1=rng</span>
        </Row>
        <Row>
          <label style={styles.settingLabel}>Sampler</label>
          <select value={chibiSampler} onChange={(e) => setChibiSampler(e.target.value)} style={styles.settingSelect} disabled={disabled}>
            {SAMPLER_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
        <Row>
          <label style={styles.settingLabel}>Denoise</label>
          <input
            type="range" min={0.3} max={0.9} step={0.05} value={chibiDenoise}
            onChange={(e) => setChibiDenoise(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            disabled={disabled}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#aaa', minWidth: 30 }}>{chibiDenoise.toFixed(2)}</span>
        </Row>
        {/* LoRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600 }}>LoRA</span>
          <button onClick={() => setChibiLoras([...chibiLoras, { name: '', weight: 0.8 }])} style={styles.miniBtn} disabled={disabled}>+</button>
          {chibiLoras.length === 0 && (
            <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>none (add to apply)</span>
          )}
        </div>
        {chibiLoras.map((lora, i) => (
          <Row key={i}>
            <input
              value={lora.name}
              onChange={(e) => { const u = [...chibiLoras]; u[i] = { ...u[i], name: e.target.value }; setChibiLoras(u); }}
              style={{ ...styles.settingInput, flex: 1 }}
              placeholder="lora_name"
              disabled={disabled}
            />
            <input
              type="number" value={lora.weight}
              onChange={(e) => { const u = [...chibiLoras]; u[i] = { ...u[i], weight: parseFloat(e.target.value) || 0 }; setChibiLoras(u); }}
              style={{ ...styles.settingInput, width: 55 }} step={0.1} min={0} max={2}
              disabled={disabled}
            />
            <button onClick={() => setChibiLoras(chibiLoras.filter((_, j) => j !== i))} style={styles.miniBtn} disabled={disabled}>x</button>
          </Row>
        ))}
      </div>

      <div style={styles.buttonRow}>
        <button
          onClick={handleGenerate}
          disabled={chibiGenerating || disabled}
          style={{ ...styles.generateBtn, opacity: chibiGenerating || disabled ? 0.5 : 1 }}
        >
          {chibiGenerating ? 'Generating...' : 'Generate Chibi'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={chibiGenerating || disabled}
          style={{ ...styles.uploadBtn, opacity: disabled ? 0.5 : 1 }}
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
            if (file) { uploadChibiImage(file); e.target.value = ''; }
          }}
        />
      </div>

      {chibiGenerating && (
        <div style={styles.progressText}>Sending to ComfyUI...</div>
      )}
      {chibiError && (
        <div style={styles.errorText}>{chibiError}</div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 4 },
  sectionTitle: { fontFamily: 'monospace', fontSize: 12, color: '#aaa', fontWeight: 600, marginBottom: 4 },
  disabledMsg: { fontFamily: 'monospace', fontSize: 9, color: '#886', background: '#2a2a1a', border: '1px solid #554422', borderRadius: 4, padding: '4px 6px' },
  label: { fontFamily: 'monospace', fontSize: 10, color: '#666', marginTop: 4 },
  textarea: { background: '#1a1a2e', border: '1px solid #3a3a5a', borderRadius: 4, color: '#ddd', fontFamily: 'monospace', fontSize: 11, padding: '6px 8px', resize: 'vertical' as const, outline: 'none' },
  actions: { display: 'flex', gap: 6, marginTop: 6 },
  saveBtn: { flex: 1, background: '#1e3a6e', border: '1px solid #4a8af8', borderRadius: 4, color: '#90b8f8', fontFamily: 'monospace', fontSize: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 },
  approveBtn: { flex: 1, background: '#1e3a2e', border: '1px solid #44aa44', borderRadius: 4, color: '#70d870', fontFamily: 'monospace', fontSize: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 },
  divider: { height: 1, background: '#2a2a3a', margin: '8px 0' },
  buttonRow: { display: 'flex', gap: 6 },
  generateBtn: { flex: 1, background: '#3a1e6e', border: '1px solid #8a4af8', borderRadius: 4, color: '#b890f8', fontFamily: 'monospace', fontSize: 10, padding: '8px 8px', cursor: 'pointer', fontWeight: 600, textAlign: 'center' },
  uploadBtn: { flex: 1, background: '#1e3a3a', border: '1px solid #4ac8c8', borderRadius: 4, color: '#90d8d8', fontFamily: 'monospace', fontSize: 10, padding: '8px 8px', cursor: 'pointer', fontWeight: 600, textAlign: 'center' },
  progressText: { fontFamily: 'monospace', fontSize: 9, color: '#8a4af8', textAlign: 'center' },
  errorText: { fontFamily: 'monospace', fontSize: 9, color: '#d88', background: '#2a1515', border: '1px solid #553333', borderRadius: 4, padding: '4px 6px' },
  settingsSection: { background: '#131324', border: '1px solid #2a2a3a', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 },
  settingLabel: { fontFamily: 'monospace', fontSize: 9, color: '#666', minWidth: 40 },
  settingInput: { background: '#1a1a2e', border: '1px solid #3a3a5a', borderRadius: 3, color: '#ddd', fontFamily: 'monospace', fontSize: 10, padding: '3px 6px', outline: 'none' },
  miniBtn: { background: '#2a2a3a', border: '1px solid #444', borderRadius: 3, color: '#888', fontFamily: 'monospace', fontSize: 8, padding: '1px 6px', cursor: 'pointer' },
  settingSelect: { background: '#1a1a2e', border: '1px solid #3a3a5a', borderRadius: 3, color: '#ddd', fontFamily: 'monospace', fontSize: 10, padding: '3px 6px', outline: 'none' },
};
