import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimatorStore, StateMachineNode, StateMachineEdge } from '../store/useAnimatorStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_W = 120;
const NODE_H = 36;
const ARROW_SIZE = 8;
const HIT_RADIUS = 8; // pixels for edge click detection

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function nodeCenter(n: StateMachineNode): [number, number] {
  return [n.x + NODE_W / 2, n.y + NODE_H / 2];
}

function clampToNodeEdge(
  nx: number, ny: number,
  tx: number, ty: number,
): [number, number] {
  const dx = tx - nx;
  const dy = ty - ny;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx === 0 && absDy === 0) return [nx, ny];
  const scaleX = absDx > 0 ? (NODE_W / 2) / absDx : Infinity;
  const scaleY = absDy > 0 ? (NODE_H / 2) / absDy : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return [nx + dx * scale, ny + dy * scale];
}

function pointOnSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  selected: boolean,
  condition: string,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);
  if (len < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = selected ? 2.5 : 1.5;

  // Curved arc for self-loops
  if (Math.abs(x1 - x2) < 4 && Math.abs(y1 - y2) < 4) {
    ctx.beginPath();
    ctx.arc(x1, y1 - NODE_H, 18, 0, Math.PI * 1.8);
    ctx.stroke();
  } else {
    // Slight curve
    const cx = (x1 + x2) / 2 + Math.cos(angle + Math.PI / 2) * 18;
    const cy = (y1 + y2) / 2 + Math.sin(angle + Math.PI / 2) * 18;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();

    // Arrowhead at endpoint
    const t = 0.9;
    const qx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
    const qy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
    const arrowAngle = Math.atan2(y2 - qy, x2 - qx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - ARROW_SIZE * Math.cos(arrowAngle - 0.4),
      y2 - ARROW_SIZE * Math.sin(arrowAngle - 0.4),
    );
    ctx.lineTo(
      x2 - ARROW_SIZE * Math.cos(arrowAngle + 0.4),
      y2 - ARROW_SIZE * Math.sin(arrowAngle + 0.4),
    );
    ctx.closePath();
    ctx.fill();

    // Condition label at midpoint
    if (condition) {
      ctx.fillStyle = selected ? '#f0d080' : '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(condition, (x1 + x2) / 2 + 10, (y1 + y2) / 2 - 12);
    }
  }
  ctx.restore();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: StateMachineNode,
  label: string,
  selected: boolean,
  connecting: boolean,
) {
  const { x, y } = node;
  ctx.save();

  // Shadow
  ctx.shadowColor = selected ? '#4488ff88' : '#00000088';
  ctx.shadowBlur = selected ? 10 : 4;

  // Background
  ctx.fillStyle = selected ? '#1e3060' : connecting ? '#2a3a1a' : '#1e1e30';
  ctx.strokeStyle = selected ? '#6090e0' : connecting ? '#80c840' : '#3a3a60';
  ctx.lineWidth = selected ? 2 : 1.5;

  // Rounded rect
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + NODE_W - r, y);
  ctx.quadraticCurveTo(x + NODE_W, y, x + NODE_W, y + r);
  ctx.lineTo(x + NODE_W, y + NODE_H - r);
  ctx.quadraticCurveTo(x + NODE_W, y + NODE_H, x + NODE_W - r, y + NODE_H);
  ctx.lineTo(x + r, y + NODE_H);
  ctx.quadraticCurveTo(x, y + NODE_H, x, y + NODE_H - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = selected ? '#c0d8ff' : '#ccccee';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + NODE_W / 2, y + NODE_H / 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// StateMachineGraph
// ---------------------------------------------------------------------------

type InteractionMode =
  | { kind: 'idle' }
  | { kind: 'dragging'; nodeId: string; startNodeX: number; startNodeY: number; mouseStartX: number; mouseStartY: number }
  | { kind: 'connecting'; fromId: string; mouseX: number; mouseY: number }
  | { kind: 'panning'; startScrollX: number; startScrollY: number; mouseStartX: number; mouseStartY: number };

export function StateMachineGraph() {
  const clips = useAnimatorStore((s) => s.clips);
  const smNodes = useAnimatorStore((s) => s.smNodes);
  const smEdges = useAnimatorStore((s) => s.smEdges);
  const selectedClipId = useAnimatorStore((s) => s.selectedClipId);
  const selectedEdgeId = useAnimatorStore((s) => s.selectedEdgeId);
  const {
    selectClip,
    moveSmNode,
    addSmEdge,
    removeSmEdge,
    selectSmEdge,
    autoLayoutSmNodes,
    updateSmEdge,
  } = useAnimatorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 300 });
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<InteractionMode>({ kind: 'idle' });
  const [edgeConditionEdit, setEdgeConditionEdit] = useState<{
    edgeId: string;
    value: string;
  } | null>(null);

  // Observe container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derive label from clip
  const clipLabel = useCallback(
    (id: string) => clips.find((c) => c.id === id)?.name ?? id.slice(0, 6),
    [clips],
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(0, 0, size.w, size.h);

    // Grid
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 1;
    const gridSize = 32;
    const gx = ((-scroll.x) % gridSize + gridSize) % gridSize;
    const gy = ((-scroll.y) % gridSize + gridSize) % gridSize;
    for (let x = gx; x < size.w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.h); ctx.stroke();
    }
    for (let y = gy; y < size.h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.w, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(-scroll.x, -scroll.y);

    // Edges
    for (const edge of smEdges) {
      const fromNode = smNodes.find((n) => n.id === edge.from);
      const toNode = smNodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;
      const [fx, fy] = nodeCenter(fromNode);
      const [tx, ty] = nodeCenter(toNode);
      const [ex, ey] = clampToNodeEdge(tx, ty, fx, fy);
      const [sx, sy] = clampToNodeEdge(fx, fy, tx, ty);
      drawArrow(ctx, sx, sy, ex, ey, edge.id === selectedEdgeId ? '#f0c040' : '#4a6a9a', edge.id === selectedEdgeId, edge.condition);
    }

    // In-progress connecting line
    if (mode.kind === 'connecting') {
      const fromNode = smNodes.find((n) => n.id === mode.fromId);
      if (fromNode) {
        const [fx, fy] = nodeCenter(fromNode);
        const mx = mode.mouseX + scroll.x;
        const my = mode.mouseY + scroll.y;
        ctx.save();
        ctx.strokeStyle = '#80e060';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Nodes
    for (const node of smNodes) {
      const isSelected = node.id === selectedClipId;
      const isConnecting = mode.kind === 'connecting' && mode.fromId === node.id;
      drawNode(ctx, node, clipLabel(node.id), isSelected, isConnecting);
    }

    ctx.restore();
  }, [smNodes, smEdges, selectedClipId, selectedEdgeId, mode, scroll, size, clipLabel]);

  // Hit testing
  const nodeAt = useCallback(
    (mx: number, my: number): StateMachineNode | null => {
      const wx = mx + scroll.x;
      const wy = my + scroll.y;
      for (let i = smNodes.length - 1; i >= 0; i--) {
        const n = smNodes[i];
        if (wx >= n.x && wx <= n.x + NODE_W && wy >= n.y && wy <= n.y + NODE_H) {
          return n;
        }
      }
      return null;
    },
    [smNodes, scroll],
  );

  const edgeAt = useCallback(
    (mx: number, my: number): StateMachineEdge | null => {
      const wx = mx + scroll.x;
      const wy = my + scroll.y;
      for (const edge of smEdges) {
        const fromNode = smNodes.find((n) => n.id === edge.from);
        const toNode = smNodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) continue;
        const [fx, fy] = nodeCenter(fromNode);
        const [tx, ty] = nodeCenter(toNode);
        const [ex, ey] = clampToNodeEdge(tx, ty, fx, fy);
        const [sx, sy] = clampToNodeEdge(fx, fy, tx, ty);
        const mid = { x: (sx + ex) / 2, y: (sy + ey) / 2 };
        if (pointOnSegmentDist(wx, wy, sx, sy, ex, ey) < HIT_RADIUS) {
          return edge;
        }
      }
      return null;
    },
    [smNodes, smEdges, scroll],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = nodeAt(mx, my);

      if (e.altKey && node) {
        // Start connecting
        setMode({ kind: 'connecting', fromId: node.id, mouseX: mx, mouseY: my });
        return;
      }

      if (node) {
        selectClip(node.id);
        selectSmEdge(null);
        setMode({
          kind: 'dragging',
          nodeId: node.id,
          startNodeX: node.x,
          startNodeY: node.y,
          mouseStartX: mx,
          mouseStartY: my,
        });
        return;
      }

      const edge = edgeAt(mx, my);
      if (edge) {
        selectSmEdge(edge.id);
        selectClip(null);
        return;
      }

      // Pan
      selectSmEdge(null);
      setMode({
        kind: 'panning',
        startScrollX: scroll.x,
        startScrollY: scroll.y,
        mouseStartX: mx,
        mouseStartY: my,
      });
    },
    [nodeAt, edgeAt, selectClip, selectSmEdge, scroll],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mode.kind === 'dragging') {
        const dx = mx - mode.mouseStartX;
        const dy = my - mode.mouseStartY;
        moveSmNode(mode.nodeId, mode.startNodeX + dx, mode.startNodeY + dy);
      } else if (mode.kind === 'connecting') {
        setMode({ ...mode, mouseX: mx, mouseY: my });
      } else if (mode.kind === 'panning') {
        const dx = mx - mode.mouseStartX;
        const dy = my - mode.mouseStartY;
        setScroll({
          x: Math.max(0, mode.startScrollX - dx),
          y: Math.max(0, mode.startScrollY - dy),
        });
      }
    },
    [mode, moveSmNode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode.kind === 'connecting') {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const targetNode = nodeAt(mx, my);
        if (targetNode && targetNode.id !== mode.fromId) {
          addSmEdge(mode.fromId, targetNode.id);
        }
      }
      setMode({ kind: 'idle' });
    },
    [mode, nodeAt, addSmEdge],
  );

  const handleMouseLeave = useCallback(() => {
    if (mode.kind !== 'idle') setMode({ kind: 'idle' });
  }, [mode]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const edge = edgeAt(mx, my);
      if (edge) {
        setEdgeConditionEdit({ edgeId: edge.id, value: edge.condition });
      }
    },
    [edgeAt],
  );

  const selectedEdge = smEdges.find((e) => e.id === selectedEdgeId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0e0e1a',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '4px 8px',
          background: '#1a1a2a',
          borderBottom: '1px solid #2a2a3a',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#666' }}>
          STATE MACHINE
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#444' }}>
          Alt+drag = connect
        </span>
        <button onClick={autoLayoutSmNodes} style={smBtnStyle}>
          Auto Layout
        </button>
        {selectedEdgeId && (
          <button
            onClick={() => removeSmEdge(selectedEdgeId)}
            style={{ ...smBtnStyle, color: '#e07070', borderColor: '#5a2020' }}
          >
            Delete Edge
          </button>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: mode.kind === 'connecting' ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
        />

        {/* Edge condition edit popover */}
        {edgeConditionEdit && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#222233',
              border: '1px solid #4a6aaa',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              zIndex: 100,
              minWidth: 220,
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#888' }}>
              Transition Condition
            </span>
            <input
              autoFocus
              value={edgeConditionEdit.value}
              onChange={(e) =>
                setEdgeConditionEdit({ ...edgeConditionEdit, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateSmEdge(edgeConditionEdit.edgeId, edgeConditionEdit.value);
                  setEdgeConditionEdit(null);
                } else if (e.key === 'Escape') {
                  setEdgeConditionEdit(null);
                }
              }}
              placeholder="e.g. speed > 0, dir == north"
              style={{
                background: '#1a1a2a',
                border: '1px solid #444',
                borderRadius: 3,
                color: '#ddd',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '4px 6px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  updateSmEdge(edgeConditionEdit.edgeId, edgeConditionEdit.value);
                  setEdgeConditionEdit(null);
                }}
                style={{ ...smBtnStyle, flex: 1 }}
              >
                OK
              </button>
              <button
                onClick={() => setEdgeConditionEdit(null)}
                style={{ ...smBtnStyle, flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected edge info */}
      {selectedEdge && (
        <div
          style={{
            padding: '4px 10px',
            background: '#1a1a2a',
            borderTop: '1px solid #2a2a3a',
            fontFamily: 'monospace',
            fontSize: 9,
            color: '#888',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#90b8f8' }}>{clipLabel(selectedEdge.from)}</span>
          {' -> '}
          <span style={{ color: '#90b8f8' }}>{clipLabel(selectedEdge.to)}</span>
          {selectedEdge.condition && (
            <span style={{ color: '#f0c040', marginLeft: 8 }}>
              [{selectedEdge.condition}]
            </span>
          )}
          <span style={{ color: '#444', marginLeft: 8 }}>
            (Dbl-click edge to edit condition)
          </span>
        </div>
      )}
    </div>
  );
}

const smBtnStyle: React.CSSProperties = {
  background: '#222233',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#888',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '2px 8px',
  cursor: 'pointer',
};
