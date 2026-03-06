import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

type MessageHandler = (message: string, clientId: string) => void;

export interface ClientInfo {
  ws: WebSocket;
  clientId: string;
  toolName?: string;
}

/**
 * WSServer wraps ws.WebSocketServer and adds per-client ID tracking,
 * tool registration, broadcast helpers and a typed message handler callback.
 */
export class WSServer {
  private readonly port: number;
  private wss: WebSocketServer | null = null;
  private readonly clients = new Map<string, ClientInfo>();
  private messageHandler: MessageHandler | null = null;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Start listening for incoming WebSocket connections.
   */
  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('listening', () => {
      console.log(`[WSServer] Listening on ws://localhost:${this.port}`);
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = randomUUID();
      this.clients.set(clientId, { ws, clientId });
      console.log(
        `[WSServer] Client connected: ${clientId} (total: ${this.clients.size})`,
      );

      ws.on('message', (raw) => {
        const message = raw.toString('utf8');
        console.log(`[WSServer] <- [${clientId}] ${message}`);
        this.messageHandler?.(message, clientId);
      });

      ws.on('close', () => {
        const info = this.clients.get(clientId);
        const toolLabel = info?.toolName ? ` (tool: ${info.toolName})` : '';
        this.clients.delete(clientId);
        console.log(
          `[WSServer] Client disconnected: ${clientId}${toolLabel} (total: ${this.clients.size})`,
        );
      });

      ws.on('error', (err) => {
        console.error(`[WSServer] Client error [${clientId}]: ${err.message}`);
        this.clients.delete(clientId);
      });
    });

    this.wss.on('error', (err) => {
      console.error(`[WSServer] Server error: ${err.message}`);
    });
  }

  /**
   * Register a client as a named tool (e.g. "pixel-painter").
   */
  registerTool(clientId: string, toolName: string): void {
    const info = this.clients.get(clientId);
    if (info) {
      info.toolName = toolName;
      console.log(`[WSServer] Registered tool: ${toolName} -> ${clientId}`);
    }
  }

  /**
   * Find the clientId of a registered tool by name.
   */
  findTool(toolName: string): string | undefined {
    for (const [id, info] of this.clients) {
      if (info.toolName === toolName && info.ws.readyState === WebSocket.OPEN) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Get list of all registered tool names.
   */
  getToolList(): string[] {
    const tools: string[] = [];
    for (const info of this.clients.values()) {
      if (info.toolName && info.ws.readyState === WebSocket.OPEN) {
        tools.push(info.toolName);
      }
    }
    return tools;
  }

  /**
   * Send a message to every connected client.
   */
  broadcast(msg: string): void {
    if (this.clients.size === 0) return;
    console.log(`[WSServer] -> broadcast (${this.clients.size} clients)`);
    for (const [id, info] of this.clients) {
      if (info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(msg);
      } else {
        console.warn(`[WSServer] Skipping non-open client: ${id}`);
      }
    }
  }

  /**
   * Send a message to one specific client identified by clientId.
   * Returns true if the message was delivered, false otherwise.
   */
  sendTo(clientId: string, msg: string): boolean {
    const info = this.clients.get(clientId);
    if (!info || info.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WSServer] sendTo: client not found or not open: ${clientId}`);
      return false;
    }
    console.log(`[WSServer] -> [${clientId}]`);
    info.ws.send(msg);
    return true;
  }

  /**
   * Register a handler that is called whenever a client sends a message.
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /** Number of currently connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * Shut down the WebSocket server and disconnect all clients.
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      for (const info of this.clients.values()) {
        info.ws.terminate();
      }
      this.clients.clear();
      this.wss.close(() => resolve());
    });
  }
}
