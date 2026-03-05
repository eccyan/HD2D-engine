#!/usr/bin/env node
/**
 * Remote control script for Audio Composer's Stable Audio generation.
 * Connects via test harness WebSocket to drive generation from CLI.
 *
 * Usage: node sa-remote-generate.mjs <layer> <duration> <prompt>
 *   layer: bass | harmony | melody | percussion
 *   duration: seconds (1-11)
 *   prompt: text prompt for Stable Audio
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const WebSocket = require('/Users/eccyan/dev/vulkan-game/tools/node_modules/.pnpm/ws@8.19.0/node_modules/ws');

const WS_URL = 'ws://localhost:6177';
const POLL_INTERVAL = 500;
const TIMEOUT = 120_000;

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

let reqId = 0;
function send(ws, cmd) {
  return new Promise((resolve, reject) => {
    const id = `req_${++reqId}`;
    const handler = (raw) => {
      const resp = JSON.parse(raw.toString());
      ws.off('message', handler);
      resolve(resp);
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ ...cmd, id }));
    setTimeout(() => { ws.off('message', handler); reject(new Error('Request timeout')); }, 10000);
  });
}

async function dispatch(ws, action, ...args) {
  const resp = await send(ws, { type: 'dispatch', action, args });
  if (resp.type === 'error') throw new Error(`dispatch ${action}: ${resp.message}`);
  return resp;
}

async function getState(ws, selector) {
  const resp = await send(ws, { type: 'get_state', selector });
  if (resp.type === 'error') throw new Error(`get_state: ${resp.message}`);
  return resp.data;
}

async function waitForStatus(ws, targetStatus, timeoutMs = TIMEOUT) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getState(ws, 'saStatus');
    if (status === targetStatus) return status;
    if (status === 'error') {
      const err = await getState(ws, 'saError');
      throw new Error(`Generation error: ${err}`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error(`Timed out waiting for status "${targetStatus}"`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node sa-remote-generate.mjs <layer> <duration> <prompt>');
    console.error('  layer: bass | harmony | melody | percussion');
    process.exit(1);
  }

  const [layer, durationStr, ...promptParts] = args;
  const duration = parseInt(durationStr);
  const prompt = promptParts.join(' ');

  console.log(`Connecting to Audio Composer at ${WS_URL}...`);
  const ws = await connect();
  console.log('Connected.');

  // Set parameters
  console.log(`Setting target layer: ${layer}`);
  await dispatch(ws, 'setSaTargetLayer', layer);

  console.log(`Setting prompt: "${prompt}"`);
  await dispatch(ws, 'setSaPrompt', prompt);

  console.log(`Setting duration: ${duration}s`);
  await dispatch(ws, 'setSaDuration', duration);

  // Trigger generation
  console.log('Triggering Stable Audio generation...');
  await dispatch(ws, 'requestSaGenerate');

  // Wait for completion
  console.log('Waiting for generation to complete...');
  await waitForStatus(ws, 'ready');
  console.log('Generation complete!');

  // Apply to layer
  console.log(`Applying to ${layer} layer...`);
  await dispatch(ws, 'requestSaApply');

  // Wait for it to be applied (status goes back to idle)
  await waitForStatus(ws, 'idle', 10000);
  console.log(`Applied to ${layer} layer.`);

  ws.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
