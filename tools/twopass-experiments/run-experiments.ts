/**
 * Two-pass IP-Adapter pipeline experiment script.
 *
 * Tests various parameter combinations for the Concept→Pose→Chibi→Pixel pipeline
 * and the single-pass IP-Adapter pipeline for comparison.
 *
 * Usage: npx tsx tools/twopass-experiments/run-experiments.ts
 */

import fs from "fs";
import path from "path";
import { ComfyUIClient } from "../packages/ai-providers/src/comfyui.js";

const COMFY_URL = "http://127.0.0.1:8188";
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ASSETS_DIR = path.resolve(
  __dirname,
  "../../assets/characters/protagonist"
);
const OUTPUT_DIR = path.resolve(__dirname, "results");
const CHECKPOINT = "AnythingV5_v5PrtRE.safetensors";
const VAE = "vae-ft-mse-840000-ema-pruned.safetensors";
const OPENPOSE_MODEL = "control_v11p_sd15_openpose.pth";

// Pose templates (walk_down 4 frames — good for testing animation consistency)
// Normalized coordinates matching pose-templates.ts WALK_DOWN
const WALK_DOWN_POSES: [number, number][][] = [
  // Frame 0 — right foot forward
  [[0.50,0.15],[0.50,0.24],[0.38,0.27],[0.32,0.38],[0.30,0.48],
   [0.62,0.27],[0.68,0.38],[0.70,0.48],[0.50,0.50],
   [0.43,0.51],[0.40,0.66],[0.38,0.82],
   [0.57,0.51],[0.58,0.65],[0.60,0.78]],
  // Frame 1 — passing
  [[0.50,0.15],[0.50,0.24],[0.38,0.27],[0.36,0.40],[0.38,0.50],
   [0.62,0.27],[0.64,0.40],[0.62,0.50],[0.50,0.50],
   [0.43,0.51],[0.44,0.67],[0.44,0.82],
   [0.57,0.51],[0.56,0.67],[0.56,0.82]],
  // Frame 2 — left foot forward
  [[0.50,0.15],[0.50,0.24],[0.38,0.27],[0.32,0.38],[0.30,0.48],
   [0.62,0.27],[0.68,0.38],[0.70,0.48],[0.50,0.50],
   [0.57,0.51],[0.58,0.66],[0.60,0.82],
   [0.43,0.51],[0.42,0.65],[0.40,0.78]],
  // Frame 3 — passing other side
  [[0.50,0.15],[0.50,0.24],[0.38,0.27],[0.36,0.40],[0.38,0.50],
   [0.62,0.27],[0.64,0.40],[0.62,0.50],[0.50,0.50],
   [0.43,0.51],[0.44,0.67],[0.44,0.82],
   [0.57,0.51],[0.56,0.67],[0.56,0.82]],
];

// Limb connections with colors (OpenPose style)
const LIMBS: [number, number, string][] = [
  [0,1,'#ff0000'],[1,2,'#ff5500'],[2,3,'#ffaa00'],[3,4,'#ffff00'],
  [1,5,'#aaff00'],[5,6,'#55ff00'],[6,7,'#00ff00'],
  [1,8,'#00ff55'],[8,9,'#00ffaa'],[9,10,'#00ffff'],[10,11,'#00aaff'],
  [8,12,'#0055ff'],[12,13,'#0000ff'],[13,14,'#5500ff'],
];

interface ExperimentConfig {
  name: string;
  mode: "two-pass" | "single-pass";
  ipAdapterWeight: number;
  ipAdapterStartAt: number;
  ipAdapterEndAt: number;
  openPoseStrength: number;
  chibiWeight: number;    // only for two-pass
  chibiDenoise: number;   // only for two-pass
  steps: number;
  cfg: number;
  seed: number;
  consistentSeed: boolean;
}

// Parameter sweep experiments
const EXPERIMENTS: ExperimentConfig[] = [
  // === Baseline two-pass with default parameters ===
  {
    name: "twopass_baseline",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === Chibi denoise sweep (how much to chibi-fy) ===
  {
    name: "twopass_chibi_den_0.3",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.3,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
  {
    name: "twopass_chibi_den_0.5",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
  {
    name: "twopass_chibi_den_0.7",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.7,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === Chibi weight sweep ===
  {
    name: "twopass_chibi_wt_0.5",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.5, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
  {
    name: "twopass_chibi_wt_0.9",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.9, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === IP-Adapter end_at sweep (identity vs pose control) ===
  {
    name: "twopass_ipa_end_0.5",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.5,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
  {
    name: "twopass_ipa_end_1.0",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 1.0,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === Pose strength sweep ===
  {
    name: "twopass_pose_0.5",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.5, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
  {
    name: "twopass_pose_1.0",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 1.0, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === Consistent seed vs varied seed ===
  {
    name: "twopass_varied_seed",
    mode: "two-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0.7, chibiDenoise: 0.5,
    steps: 20, cfg: 5, seed: 42, consistentSeed: false,
  },

  // === Single-pass comparison (chibi as reference) ===
  {
    name: "singlepass_chibi_ref",
    mode: "single-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0, chibiDenoise: 0,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },

  // === Single-pass with concept art reference ===
  {
    name: "singlepass_concept_ref",
    mode: "single-pass",
    ipAdapterWeight: 0.7, ipAdapterStartAt: 0.0, ipAdapterEndAt: 0.8,
    openPoseStrength: 0.8, chibiWeight: 0, chibiDenoise: 0,
    steps: 20, cfg: 5, seed: 42, consistentSeed: true,
  },
];

/** Render a pose skeleton to a PNG buffer (server-side via canvas-less approach). */
function renderPoseToPngBuffer(
  pose: [number, number][],
  width: number,
  height: number,
): Buffer {
  // Create a simple SVG, convert to PNG via ComfyUI's LoadImage
  // Actually, we'll create a minimal PNG with pose drawn.
  // Since we're in Node.js without canvas, we'll build a BMP-like approach
  // or just upload a rendered pose via the existing approach.
  //
  // Simpler: create an SVG string and convert.
  // Simplest: use sharp or create raw pixel data.
  //
  // For this experiment, let's create a raw RGBA buffer and encode as PNG manually.
  const pixels = Buffer.alloc(width * height * 4, 0); // black RGBA

  // Draw lines (Bresenham) and dots
  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
    const off = (iy * width + ix) * 4;
    pixels[off] = r;
    pixels[off + 1] = g;
    pixels[off + 2] = b;
    pixels[off + 3] = 255;
  }

  function parseHex(hex: string): [number, number, number] {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  function drawLine(
    x0: number, y0: number, x1: number, y1: number,
    r: number, g: number, b: number, thickness: number,
  ) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const cx = x0 + dx * t, cy = y0 + dy * t;
      for (let tx = -thickness; tx <= thickness; tx++) {
        for (let ty = -thickness; ty <= thickness; ty++) {
          if (tx * tx + ty * ty <= thickness * thickness) {
            setPixel(cx + tx, cy + ty, r, g, b);
          }
        }
      }
    }
  }

  const lineW = Math.max(2, Math.round(Math.min(width, height) / 30));

  // Draw limbs
  for (const [i, j, color] of LIMBS) {
    const a = pose[i], b = pose[j];
    if (!a || !b) continue;
    const [cr, cg, cb] = parseHex(color);
    drawLine(a[0] * width, a[1] * height, b[0] * width, b[1] * height, cr, cg, cb, lineW);
  }

  // Draw keypoint dots
  for (const kp of pose) {
    if (!kp) continue;
    const cx = kp[0] * width, cy = kp[1] * height;
    const r2 = lineW * 0.8;
    for (let dx = -r2; dx <= r2; dx++) {
      for (let dy = -r2; dy <= r2; dy++) {
        if (dx * dx + dy * dy <= r2 * r2) {
          setPixel(cx + dx, cy + dy, 255, 255, 255);
        }
      }
    }
  }

  // Encode as PNG (minimal implementation)
  return encodePNG(pixels, width, height);
}

/** Minimal PNG encoder for RGBA pixel data. */
function encodePNG(pixels: Buffer, width: number, height: number): Buffer {
  const { deflateSync } = require("zlib") as typeof import("zlib");

  // Build raw image data (filter byte 0 = None for each row)
  const rawRows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const filterByte = Buffer.from([0]); // no filter
    const rowData = pixels.subarray(y * width * 4, (y + 1) * width * 4);
    rawRows.push(Buffer.concat([filterByte, rowData]));
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = deflateSync(rawData);

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeB, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function runExperiment(
  client: ComfyUIClient,
  config: ExperimentConfig,
  conceptBytes: Uint8Array,
  chibiBytes: Uint8Array,
): Promise<void> {
  const outDir = path.join(OUTPUT_DIR, config.name);
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).filter(f => f.endsWith('.png')).length >= 4) {
    console.log(`\n=== ${config.name} === SKIPPED (already exists)`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n=== ${config.name} ===`);
  console.log(`  mode=${config.mode} ipa_w=${config.ipAdapterWeight} ipa_end=${config.ipAdapterEndAt}`);
  console.log(`  pose=${config.openPoseStrength} chibi_w=${config.chibiWeight} chibi_d=${config.chibiDenoise}`);
  console.log(`  seed=${config.seed} consistent=${config.consistentSeed}`);

  // Save params
  fs.writeFileSync(path.join(outDir, "params.json"), JSON.stringify(config, null, 2));

  const prompt =
    "concept art, character design, a male knight, medieval fantasy, golden plate armor, " +
    "facing forward, front view, walk pose, " +
    "pixel art, 8-bit, retro game graphics, clean edges, game asset, single character, centered, transparent background, same character";
  const negative =
    "blurry, smooth, shadow, 3d render, photograph, photorealistic, multiple characters, " +
    "busy background, watermark, text, signature, oversaturated, neon, vibrant colors, high contrast";

  const startTime = Date.now();

  for (let frame = 0; frame < 4; frame++) {
    const frameSeed = config.consistentSeed ? config.seed : config.seed + frame;
    const pose = WALK_DOWN_POSES[frame];
    const posePng = renderPoseToPngBuffer(pose, 512, 512);

    console.log(`  frame ${frame}: generating (seed=${frameSeed})...`);
    const frameStart = Date.now();

    try {
      let result: Uint8Array;

      if (config.mode === "two-pass") {
        result = await client.generateTwoPassIPAdapterWithRetry(
          prompt, conceptBytes, chibiBytes, new Uint8Array(posePng),
          {
            width: 512, height: 512,
            steps: config.steps, seed: frameSeed, cfgScale: config.cfg,
            samplerName: "euler", scheduler: "karras",
            checkpoint: CHECKPOINT, vae: VAE,
            negativePrompt: negative, denoise: 1.0, loras: [],
            ipAdapterWeight: config.ipAdapterWeight,
            ipAdapterPreset: "PLUS (high strength)",
            ipAdapterStartAt: config.ipAdapterStartAt,
            ipAdapterEndAt: config.ipAdapterEndAt,
            openPoseModel: OPENPOSE_MODEL,
            openPoseStrength: config.openPoseStrength,
            chibiWeight: config.chibiWeight,
            chibiDenoise: config.chibiDenoise,
            outputWidth: 128, outputHeight: 128,
          },
        );
      } else {
        // Single-pass: use chibi or concept as reference depending on experiment name
        const ref = config.name.includes("concept") ? conceptBytes : chibiBytes;
        result = await client.generateIPAdapterWithRetry(
          prompt, ref, new Uint8Array(posePng),
          {
            width: 512, height: 512,
            steps: config.steps, seed: frameSeed, cfgScale: config.cfg,
            samplerName: "euler", scheduler: "karras",
            checkpoint: CHECKPOINT, vae: VAE,
            negativePrompt: negative, denoise: 1.0, loras: [],
            ipAdapterWeight: config.ipAdapterWeight,
            ipAdapterPreset: "PLUS (high strength)",
            ipAdapterStartAt: config.ipAdapterStartAt,
            ipAdapterEndAt: config.ipAdapterEndAt,
            openPoseModel: OPENPOSE_MODEL,
            openPoseStrength: config.openPoseStrength,
            outputWidth: 128, outputHeight: 128,
          },
        );
      }

      const elapsed = ((Date.now() - frameStart) / 1000).toFixed(1);
      console.log(`  frame ${frame}: done in ${elapsed}s (${result.length} bytes)`);
      fs.writeFileSync(path.join(outDir, `frame_${frame}.png`), result);
    } catch (err) {
      console.error(`  frame ${frame}: ERROR — ${err}`);
      fs.writeFileSync(path.join(outDir, `frame_${frame}_error.txt`), String(err));
    }
  }

  // Also save the pose images for reference
  for (let frame = 0; frame < 4; frame++) {
    const posePng = renderPoseToPngBuffer(WALK_DOWN_POSES[frame], 512, 512);
    fs.writeFileSync(path.join(outDir, `pose_${frame}.png`), posePng);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Total: ${totalElapsed}s`);
}

async function main() {
  console.log("=== Two-Pass IP-Adapter Pipeline Experiments ===\n");

  // Load images
  const conceptBytes = new Uint8Array(
    fs.readFileSync(path.join(ASSETS_DIR, "concept.png"))
  );
  const chibiBytes = new Uint8Array(
    fs.readFileSync(path.join(ASSETS_DIR, "chibi.png"))
  );
  console.log(`Concept: ${conceptBytes.length} bytes`);
  console.log(`Chibi: ${chibiBytes.length} bytes`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = new ComfyUIClient(COMFY_URL, 1000, 600_000);

  // Check ComfyUI is ready
  try {
    const check = await fetch(`${COMFY_URL}/system_stats`);
    if (!check.ok) throw new Error(`HTTP ${check.status}`);
    console.log("ComfyUI: ready");
  } catch (err) {
    console.error(`ComfyUI not available at ${COMFY_URL}:`, err);
    process.exit(1);
  }

  const totalStart = Date.now();

  for (const config of EXPERIMENTS) {
    try {
      await runExperiment(client, config, conceptBytes, chibiBytes);
    } catch (err) {
      console.error(`\n=== ${config.name} === FAILED:`, err);
    }
  }

  const totalMinutes = ((Date.now() - totalStart) / 60000).toFixed(1);
  console.log(`\n=== All experiments complete in ${totalMinutes} minutes ===`);
  console.log(`Results: ${OUTPUT_DIR}`);

  // Generate summary
  const summary: Record<string, unknown>[] = [];
  for (const config of EXPERIMENTS) {
    const dir = path.join(OUTPUT_DIR, config.name);
    const frames = [0, 1, 2, 3].map((i) => {
      const f = path.join(dir, `frame_${i}.png`);
      return fs.existsSync(f) ? fs.statSync(f).size : 0;
    });
    summary.push({
      name: config.name,
      mode: config.mode,
      frames_ok: frames.filter((s) => s > 1000).length,
      frame_sizes: frames,
      params: config,
    });
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log("Summary written to results/summary.json");
}

main().catch(console.error);
