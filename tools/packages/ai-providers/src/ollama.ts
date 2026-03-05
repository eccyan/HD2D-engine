import type { LLMProvider, LLMGenerateOptions } from "./types.js";

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

/**
 * HTTP client for Ollama local LLM server.
 *
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaClient implements LLMProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  /**
   * @param baseUrl - Ollama server base URL (default: http://localhost:11434)
   * @param model   - Model name to use for generation (default: "llama3")
   */
  constructor(baseUrl = "http://localhost:11434", model = "llama3") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  /**
   * Generate text from a prompt using the configured Ollama model.
   *
   * @param prompt - User prompt text
   * @param opts   - Optional generation parameters
   * @returns Generated text response
   */
  async generate(prompt: string, opts?: LLMGenerateOptions): Promise<string> {
    const body: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
    };

    if (opts?.system !== undefined) {
      body.system = opts.system;
    }

    if (opts?.temperature !== undefined || opts?.maxTokens !== undefined) {
      body.options = {};
      if (opts.temperature !== undefined) {
        body.options.temperature = opts.temperature;
      }
      if (opts.maxTokens !== undefined) {
        body.options.num_predict = opts.maxTokens;
      }
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      throw new Error(
        `Ollama generate failed: HTTP ${response.status} ${response.statusText} — ${text}`
      );
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
  }

  /**
   * Check whether the Ollama server is reachable and responding.
   *
   * @returns true if the server returns a valid tags list, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as OllamaTagsResponse;
      return Array.isArray(data.models);
    } catch {
      return false;
    }
  }
}
