import React, { useRef, useState, useEffect } from 'react';
import type { PixelArt } from '@vulkan-game-tools/asset-types';
import { useSeuratStore } from '../../store/useSeuratStore.js';
import { SAMPLER_NAMES } from '../../lib/ai-generate.js';

export function PixelActions() {
  const manifest = useSeuratStore((s) => s.manifest);
  const savePixel = useSeuratStore((s) => s.savePixel);
  const aiConfig = useSeuratStore((s) => s.aiConfig);
  const pixelGenerating = useSeuratStore((s) => s.pixelGenerating);
  const pixelError = useSeuratStore((s) => s.pixelError);
  const generatePixelArt = useSeuratStore((s) => s.generatePixelArt);
  const uploadPixelImage = useSeuratStore((s) => s.uploadPixelImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stylePrompt, setStylePrompt] = useState('pixel art, 8-bit, clean edges, retro game sprite');
  const [negativePrompt, setNegativePrompt] = useState('blurry, realistic, 3d render, smooth shading');
  const [saving, setSaving] = useState(false);

  const [pixelSteps, setPixelSteps] = useState(20);
  const [pixelCfg, setPixelCfg] = useState(10);
  const [pixelSampler, setPixelSampler] = useState('euler');
  const [pixelSeed, setPixelSeed] = useState(-1);
  const [pixelCheckpoint, setPixelCheckpoint] = useState('');
  const [pixelDenoise, setPixelDenoise] = useState(0.55);
  const [pixelLoras, setPixelLoras] = useState<{ name: string; weight: number }[]>([]);

  useEffect(() => {
    setPixelSampler(aiConfig.sampler);
  }, [aiConfig.sampler]);

  useEffect(() => {
    if (!manifest?.pixel) return;
    setStylePrompt(manifest.pixel.style_prompt);
    setNegativePrompt(manifest.pixel.negative_prompt);
  }, [manifest?.character_id]);

  if (!manifest) return null;

  const chibiApproved = manifest.chibi?.approved === true;
  const disabled = !chibiApproved;

  const handleSave = async (approved?: boolean) => {
    setSaving(true);
    const pixel: PixelArt = {
      style_prompt: stylePrompt,
      negative_prompt: negativePrompt,
      reference_image: manifest.pixel?.reference_image || '',
      approved: approved ?? manifest.pixel?.approved ?? false,
    };
    await savePixel(pixel);
    setSaving(false);
  };

  const handleGenerate = async () => {
    await handleSave();
    await generatePixelArt({
      steps: pixelSteps, cfg: pixelCfg, sampler: pixelSampler, seed: pixelSeed,
      loras: pixelLoras, checkpoint: pixelCheckpoint || undefined, denoise: pixelDenoise,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Pixel Art</div>

      {disabled && (
        <div style={styles.disabledMsg}>Approve chibi art first to enable pixel art generation.</div>
      )}

      <label style={styles.label}>Style Prompt</label>
      <textarea
        value={stylePrompt}
        onChange={(e) => setStylePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        disabled={disabled}
        placeholder="pixel art, 8-bit..."
      />

      <label style={styles.label}>Negative Prompt</label>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        rows={2}
        style={styles.textarea}
        disabled={disabled}
        placeholder="blurry, realistic..."
      />

      <div style={styles.actions}>
        <button onClick={() => handleSave()} disabled={saving || disabled} style={styles.saveBtn}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {manifest.pixel?.reference_image && !manifest.pixel?.approved && (
          <button onClick={() => handleSave(true)} disabled={saving || disabled} style={styles.approveBtn}>
            Approve
          </button>
        )}
      </div>

      <div style={styles.divider} />

      <div style={styles.settingsSection}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600, marginBottom: 2 }}>
          ComfyUI Settings (Pixel)
        </div>
        <Row>
          <label style={styles.settingLabel}>Ckpt</label>
          <input
            value={pixelCheckpoint}
            onChange={(e) => setPixelCheckpoint(e.target.value)}
            style={{ ...styles.settingInput, flex: 1 }}
            placeholder={aiConfig.checkpoint || 'v1-5-pruned-emaonly.safetensors'}
            disabled={disabled}
          />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Steps</label>
          <input type="number" value={pixelSteps} onChange={(e) => setPixelSteps(parseInt(e.target.value) || 20)} style={{ ...styles.settingInput, width: 50 }} disabled={disabled} />
          <label style={styles.settingLabel}>CFG</label>
          <input type="number" value={pixelCfg} onChange={(e) => setPixelCfg(parseFloat(e.target.value) || 7)} style={{ ...styles.settingInput, width: 50 }} step={0.5} disabled={disabled} />
        </Row>
        <Row>
          <label style={styles.settingLabel}>Seed</label>
          <input type="number" value={pixelSeed} onChange={(e) => setPixelSeed(parseInt(e.target.value))} style={{ ...styles.settingInput, width: 80 }} disabled={disabled} />
          <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>-1=rng</span>
        </Row>
        <Row>
          <label style={styles.settingLabel}>Sampler</label>
          <select value={pixelSampler} onChange={(e) => setPixelSampler(e.target.value)} style={styles.settingSelect} disabled={disabled}>
            {SAMPLER_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
        <Row>
          <label style={styles.settingLabel}>Denoise</label>
          <input
            type="range" min={0.3} max={0.9} step={0.05} value={pixelDenoise}
            onChange={(e) => setPixelDenoise(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            disabled={disabled}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#aaa', minWidth: 30 }}>{pixelDenoise.toFixed(2)}</span>
        </Row>
        {/* LoRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', fontWeight: 600 }}>LoRA</span>
          <button onClick={() => setPixelLoras([...pixelLoras, { name: '', weight: 0.8 }])} style={styles.miniBtn} disabled={disabled}>+</button>
          {pixelLoras.length === 0 && (
            <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>none (add to apply)</span>
          )}
        </div>
        {pixelLoras.map((lora, i) => (
          <Row key={i}>
            <input
              value={lora.name}
              onChange={(e) => { const u = [...pixelLoras]; u[i] = { ...u[i], name: e.target.value }; setPixelLoras(u); }}
              style={{ ...styles.settingInput, flex: 1 }}
              placeholder="lora_name"
              disabled={disabled}
            />
            <input
              type="number" value={lora.weight}
              onChange={(e) => { const u = [...pixelLoras]; u[i] = { ...u[i], weight: parseFloat(e.target.value) || 0 }; setPixelLoras(u); }}
              style={{ ...styles.settingInput, width: 55 }} step={0.1} min={0} max={2}
              disabled={disabled}
            />
            <button onClick={() => setPixelLoras(pixelLoras.filter((_, j) => j !== i))} style={styles.miniBtn} disabled={disabled}>x</button>
          </Row>
        ))}
      </div>

      <div style={styles.buttonRow}>
        <button
          onClick={handleGenerate}
          disabled={pixelGenerating || disabled}
          style={{ ...styles.generateBtn, opacity: pixelGenerating || disabled ? 0.5 : 1 }}
        >
          {pixelGenerating ? 'Generating...' : 'Generate Pixel Art'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={pixelGenerating || disabled}
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
            if (file) { uploadPixelImage(file); e.target.value = ''; }
          }}
        />
      </div>

      {pixelGenerating && (
        <div style={styles.progressText}>Sending to ComfyUI...</div>
      )}
      {pixelError && (
        <div style={styles.errorText}>{pixelError}</div>
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
