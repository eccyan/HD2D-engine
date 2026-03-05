#!/usr/bin/env python3
"""
Lightweight REST server wrapping Stable Audio Open Small.

Endpoints:
    GET  /health   → { "status": "ok", "model": "stable-audio-open-small" }
    POST /generate → WAV bytes (audio/wav)
        Body: { "prompt": str, "duration": float, "steps": int, "cfg_scale": float }

Requirements:
    pip install flask torch torchaudio einops stable-audio-tools

Usage:
    python stable-audio-server.py [--port 8001] [--device cuda|cpu|mps]
"""

import argparse
import io
import sys
from typing import Optional

import torch
import torchaudio
from einops import rearrange
from flask import Flask, Response, jsonify, request
from stable_audio_tools import get_pretrained_model
from stable_audio_tools.inference.generation import generate_diffusion_cond

# ---------------------------------------------------------------------------
# Global model state
# ---------------------------------------------------------------------------
app = Flask(__name__)

model = None
model_config = None
sample_rate: int = 44100
sample_size: int = 0
device: str = "cpu"


def load_model(dev: str) -> None:
    global model, model_config, sample_rate, sample_size, device
    device = dev
    print(f"Loading stable-audio-open-small on {device}…", flush=True)
    model, model_config = get_pretrained_model("stabilityai/stable-audio-open-small")
    sample_rate = model_config["sample_rate"]
    sample_size = model_config["sample_size"]
    model = model.to(device)
    print(f"Model loaded. sample_rate={sample_rate}, max_samples={sample_size}", flush=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    if model is None:
        return jsonify({"status": "loading"}), 503
    return jsonify({"status": "ok", "model": "stable-audio-open-small"})


@app.route("/generate", methods=["POST"])
def generate():
    if model is None:
        return jsonify({"error": "Model not loaded yet"}), 503

    data = request.get_json(silent=True) or {}
    prompt: str = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    duration: float = min(float(data.get("duration", 8)), 11.0)
    steps: int = int(data.get("steps", 8))
    cfg_scale: float = float(data.get("cfg_scale", 1.0))

    conditioning = [{
        "prompt": prompt,
        "seconds_total": duration,
    }]

    try:
        with torch.no_grad():
            output = generate_diffusion_cond(
                model,
                steps=steps,
                cfg_scale=cfg_scale,
                conditioning=conditioning,
                sample_size=sample_size,
                sampler_type="pingpong",
                device=device,
            )

        # Shape: [batch, channels, samples] → [channels, samples]
        output = rearrange(output, "b d n -> d (b n)")

        # Normalize to int16 range
        output = (
            output
            .to(torch.float32)
            .div(torch.max(torch.abs(output)).clamp(min=1e-8))
            .clamp(-1, 1)
            .mul(32767)
            .to(torch.int16)
            .cpu()
        )

        # Trim to requested duration
        max_samples = int(duration * sample_rate)
        if output.shape[1] > max_samples:
            output = output[:, :max_samples]

        # Encode as WAV into memory buffer
        buf = io.BytesIO()
        torchaudio.save(buf, output, sample_rate, format="wav")
        buf.seek(0)

        return Response(buf.read(), mimetype="audio/wav")

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def detect_device() -> str:
    """Auto-detect the best available device."""
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main():
    parser = argparse.ArgumentParser(description="Stable Audio Open Small REST server")
    parser.add_argument("--port", type=int, default=8001, help="Port to listen on (default: 8001)")
    parser.add_argument("--device", type=str, default=None, help="Device: cuda, mps, or cpu (auto-detected if omitted)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)")
    args = parser.parse_args()

    dev = args.device or detect_device()
    load_model(dev)

    print(f"Starting server on {args.host}:{args.port}", flush=True)
    app.run(host=args.host, port=args.port, threaded=False)


if __name__ == "__main__":
    main()
