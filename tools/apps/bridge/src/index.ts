/**
 * Bridge proxy — relays JSON messages between:
 *   - The Vulkan game engine via /tmp/vulkan_game.sock (Unix domain socket)
 *   - Creative tool clients via ws://localhost:9100 (WebSocket)
 *
 * Also exposes a REST API on port 9101 for scene / texture file I/O.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { UnixSocketClient } from './unix-client.js';
import { WSServer } from './ws-server.js';
import { RequestTracker } from './request-tracker.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNIX_SOCKET_PATH = '/tmp/vulkan_game.sock';
const WS_PORT = 9100;
const HTTP_PORT = 9101;

// Resolve the engine's assets directory relative to this file's location.
// Project layout: tools/apps/bridge/src/index.ts → root is 4 levels up.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_DIR = path.resolve(__dirname, '../../../../');
const SCENES_DIR = path.join(ENGINE_DIR, 'assets', 'scenes');
const TEXTURES_DIR = path.join(ENGINE_DIR, 'assets', 'textures');

// ---------------------------------------------------------------------------
// Instantiate core components
// ---------------------------------------------------------------------------

const unixClient = new UnixSocketClient(2_000);
const wsServer = new WSServer(WS_PORT);
const tracker = new RequestTracker(30_000);

// ---------------------------------------------------------------------------
// WebSocket → Unix socket forwarding
// ---------------------------------------------------------------------------

wsServer.onMessage((rawMsg: string, clientId: string) => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawMsg) as Record<string, unknown>;
  } catch {
    console.warn(`[Bridge] Dropping non-JSON message from ${clientId}: ${rawMsg}`);
    return;
  }

  // Attach a unique correlation ID so we can route the response back.
  const bridgeId = randomUUID();
  parsed['_bridge_id'] = bridgeId;
  tracker.track(bridgeId, clientId);

  const serialised = JSON.stringify(parsed);
  console.log(`[Bridge] WS→Unix  [${clientId}] id=${bridgeId} cmd=${String(parsed['cmd'] ?? '?')}`);
  unixClient.send(serialised);
});

// ---------------------------------------------------------------------------
// Unix socket → WebSocket forwarding
// ---------------------------------------------------------------------------

unixClient.onData((line: string) => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    // Raw non-JSON output — broadcast as-is wrapped in a string envelope.
    const envelope = JSON.stringify({ type: 'raw', payload: line });
    wsServer.broadcast(envelope);
    return;
  }

  const bridgeId = parsed['_bridge_id'];

  if (typeof bridgeId === 'string') {
    // This is a response to a request: route back to originating client.
    const clientId = tracker.resolve(bridgeId);

    // Strip the internal field before forwarding.
    delete parsed['_bridge_id'];
    const outgoing = JSON.stringify(parsed);

    if (clientId) {
      console.log(`[Bridge] Unix→WS  [${clientId}] id=${bridgeId} type=${String(parsed['type'] ?? '?')}`);
      const sent = wsServer.sendTo(clientId, outgoing);
      if (!sent) {
        // Client disconnected before response arrived; broadcast as fallback.
        console.warn(`[Bridge] Client gone, broadcasting response for id=${bridgeId}`);
        wsServer.broadcast(outgoing);
      }
    } else {
      // ID not found (expired or already resolved) — broadcast.
      console.warn(`[Bridge] Unknown _bridge_id=${bridgeId}, broadcasting.`);
      wsServer.broadcast(outgoing);
    }
  } else {
    // This is an unsolicited event (e.g. dialog_started) — broadcast to all.
    const outgoing = JSON.stringify(parsed);
    console.log(`[Bridge] Unix→WS  broadcast event type=${String(parsed['type'] ?? '?')}`);
    wsServer.broadcast(outgoing);
  }
});

unixClient.onClose(() => {
  // Notify all connected tool clients so they can show a reconnecting indicator.
  wsServer.broadcast(JSON.stringify({ type: 'engine_disconnected' }));
});

unixClient.onError((err: Error) => {
  console.error(`[Bridge] Unix socket error: ${err.message}`);
});

// ---------------------------------------------------------------------------
// REST API (file I/O for creative tools)
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '16mb' }));

// Utility: ensure a path stays within the allowed base directory.
function safeResolve(base: string, name: string): string {
  const resolved = path.resolve(base, name);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal detected: ${name}`);
  }
  return resolved;
}

// GET /api/files/scenes/:name — read a scene JSON file
app.get('/api/files/scenes/:name', async (req: Request, res: Response) => {
  try {
    const filePath = safeResolve(SCENES_DIR, `${req.params['name']}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode = message.includes('Path traversal') ? 400 : 404;
    res.status(statusCode).json({ error: message });
  }
});

// POST /api/files/scenes/:name — write a scene JSON file
app.post('/api/files/scenes/:name', async (req: Request, res: Response) => {
  try {
    const filePath = safeResolve(SCENES_DIR, `${req.params['name']}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
    await fs.writeFile(filePath, body, 'utf8');
    console.log(`[REST] Scene written: ${filePath}`);
    res.json({ ok: true, path: filePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode = message.includes('Path traversal') ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// GET /api/files/textures/:name — read a texture file as binary
app.get('/api/files/textures/:name', async (req: Request, res: Response) => {
  try {
    const filePath = safeResolve(TEXTURES_DIR, req.params['name']);
    const data = await fs.readFile(filePath);
    // Detect content type from extension.
    const ext = path.extname(req.params['name']).toLowerCase();
    const mime = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.send(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode = message.includes('Path traversal') ? 400 : 404;
    res.status(statusCode).json({ error: message });
  }
});

// POST /api/files/textures/:name — write a texture PNG (raw binary or base64)
app.post('/api/files/textures/:name', async (req: Request, res: Response) => {
  try {
    const filePath = safeResolve(TEXTURES_DIR, req.params['name']);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let data: Buffer;
    const contentType = req.headers['content-type'] ?? '';

    if (contentType.includes('application/json') && req.body && typeof req.body['data'] === 'string') {
      // Accept base64-encoded PNG supplied as JSON: { "data": "<base64>" }
      data = Buffer.from(req.body['data'] as string, 'base64');
    } else {
      // Accept raw binary body (application/octet-stream or image/png).
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
      data = Buffer.concat(chunks);
    }

    await fs.writeFile(filePath, data);
    console.log(`[REST] Texture written: ${filePath} (${data.length} bytes)`);
    res.json({ ok: true, path: filePath, bytes: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode = message.includes('Path traversal') ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    engineConnected: unixClient.isConnected,
    wsClients: wsServer.clientCount,
    pendingRequests: tracker.pendingCount,
  });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('[Bridge] Starting up …');

  // Start the WebSocket server (non-blocking).
  wsServer.start();

  // Attempt initial connection to the game engine.
  // Failure is non-fatal — UnixSocketClient will keep retrying.
  try {
    await unixClient.connect(UNIX_SOCKET_PATH);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Bridge] Initial engine connection failed (${message}), will retry.`);
  }

  // Start REST API server.
  app.listen(HTTP_PORT, () => {
    console.log(`[Bridge] REST API listening on http://localhost:${HTTP_PORT}`);
  });

  console.log('[Bridge] Ready.');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Bridge] Received ${signal}, shutting down …`);
  tracker.destroy();
  unixClient.disconnect();
  await wsServer.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((err) => {
  console.error('[Bridge] Fatal error:', err);
  process.exit(1);
});
