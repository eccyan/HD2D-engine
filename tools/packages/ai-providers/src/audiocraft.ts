import type { AudioProvider, AudioGenerateOptions } from "./types.js";

/** Request body for POST /generate. */
interface AudioCraftGenerateRequest {
  prompt: string;
  duration?: number;
  temperature?: number;
}

/** Response body from POST /generate. */
interface AudioCraftGenerateResponse {
  /**
   * URL path to the generated audio file (e.g. "/audio/output_abc123.wav"),
   * or raw base64-encoded audio data depending on server configuration.
   */
  url?: string;
  audio_data?: string;
  format?: string;
}

/** Response body from GET /health. */
interface HealthResponse {
  status: string;
}

/**
 * HTTP client for AudioCraft local audio generation server.
 *
 * Expects a simple REST wrapper around Meta's AudioCraft / MusicGen model
 * that exposes POST /generate and GET /health endpoints.
 */
export class AudioCraftClient implements AudioProvider {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - AudioCraft server base URL (default: http://localhost:8001)
   */
  constructor(baseUrl = "http://localhost:8001") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Generate audio from a text prompt.
   *
   * @param prompt - Text description of the desired audio (e.g. "epic orchestral battle music")
   * @param opts   - Optional generation parameters (duration, temperature)
   * @returns Raw audio bytes (WAV or MP3 depending on server configuration)
   */
  async generateAudio(
    prompt: string,
    opts?: AudioGenerateOptions
  ): Promise<ArrayBuffer> {
    const requestBody: AudioCraftGenerateRequest = { prompt };

    if (opts?.duration !== undefined) {
      requestBody.duration = opts.duration;
    }
    if (opts?.temperature !== undefined) {
      requestBody.temperature = opts.temperature;
    }

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      throw new Error(
        `AudioCraft generate failed: HTTP ${response.status} ${response.statusText} — ${text}`
      );
    }

    const contentType = response.headers.get("Content-Type") ?? "";

    // Server may return raw audio bytes directly (audio/* content type)
    if (contentType.startsWith("audio/")) {
      return response.arrayBuffer();
    }

    // Or a JSON envelope with either a URL or base64 audio_data
    const data = (await response.json()) as AudioCraftGenerateResponse;

    if (data.audio_data) {
      return base64ToArrayBuffer(data.audio_data);
    }

    if (data.url) {
      const audioUrl = data.url.startsWith("http")
        ? data.url
        : `${this.baseUrl}${data.url}`;

      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(
          `AudioCraft audio fetch failed: HTTP ${audioResponse.status} ${audioResponse.statusText}`
        );
      }
      return audioResponse.arrayBuffer();
    }

    throw new Error(
      "AudioCraft response contained neither audio bytes, audio_data, nor a url field"
    );
  }

  /**
   * Check whether the AudioCraft server is reachable and healthy.
   *
   * @returns true if GET /health returns { status: "ok" }, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as HealthResponse;
      return typeof data.status === "string" && data.status.toLowerCase() === "ok";
    } catch {
      return false;
    }
  }
}

/**
 * Decode a base64 string to an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
