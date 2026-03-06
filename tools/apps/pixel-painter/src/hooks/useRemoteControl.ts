import { useEffect, useRef } from 'react';
import { usePainterStore } from '../store/usePainterStore.js';
import { handleCommand } from '../lib/remote-commands.js';

/**
 * Connects to the bridge WebSocket and registers as the "pixel-painter" tool.
 * Incoming commands are dispatched to the store via handleCommand().
 */
export function useRemoteControl(bridgeUrl: string): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;

      try {
        const ws = new WebSocket(bridgeUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[RemoteControl] Connected to bridge');
          // Register as pixel-painter tool
          ws.send(JSON.stringify({ type: 'register_tool', name: 'pixel-painter' }));
        };

        ws.onmessage = async (event) => {
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(event.data as string);
          } catch {
            return;
          }

          // Ignore registration confirmations and engine events
          if (parsed['type'] === 'registered' || parsed['type'] === 'engine_disconnected' || parsed['type'] === 'raw') {
            return;
          }

          // Handle commands
          const cmd = parsed['cmd'] as string | undefined;
          if (!cmd) return;

          const bridgeId = parsed['_bridge_id'] as string | undefined;
          const store = usePainterStore.getState();
          const resultOrPromise = handleCommand(cmd, parsed as Record<string, unknown>, store);

          // Support both sync and async command results
          const result = resultOrPromise instanceof Promise ? await resultOrPromise : resultOrPromise;

          // Send response back with bridge correlation ID
          const response: Record<string, unknown> = 'error' in result
            ? { type: 'error', error: result.error }
            : { type: 'response', cmd, ...(result.response as Record<string, unknown>) };

          if (bridgeId) {
            response['_bridge_id'] = bridgeId;
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response));
          }
        };

        ws.onclose = () => {
          console.log('[RemoteControl] Disconnected from bridge');
          wsRef.current = null;
          if (!disposed) {
            reconnectTimerRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          // onclose will fire after this
        };
      } catch {
        if (!disposed) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [bridgeUrl]);
}
