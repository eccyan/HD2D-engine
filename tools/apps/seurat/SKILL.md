# Seurat Development Guide

## Core Principles

1. **Test first** — Write a test plan and test code before implementing features. Verify expected behavior upfront so implementation targets a concrete spec.
2. **Commit as you go** — Create git commits whenever a logical unit of work is complete. Don't batch unrelated changes. Don't wait to be asked.
3. **Build before moving on** — Run `tsc --noEmit` after every change. A clean type-check is the minimum gate. Do not proceed with broken types.
4. **Restart dependent services** — After changing bridge or package code, rebuild and restart. The bridge runs compiled `dist/index.js` — it does not hot-reload.
5. **No runtime launch after coding** — A successful build is sufficient verification. Do not run the app to "check if it works."

## Development Setup

```bash
# Terminal 1: Bridge server (REST + WS proxy)
cd tools/apps/bridge && pnpm dev    # or: pnpm build && node dist/index.js

# Terminal 2: Seurat dev server
cd tools/apps/seurat && pnpm dev    # http://localhost:5179

# Terminal 3: ComfyUI (required for generation)
cd /path/to/ComfyUI && python main.py --listen --enable-cors-header "*"
```

### Ports

| Service | Port |
|---------|------|
| Seurat dev | 5179 |
| Test harness WS | 6179 |
| Bridge REST + WS | 9101 |
| ComfyUI | 8188 |

## Project Structure

```
tools/
├── apps/
│   ├── seurat/          # React + Vite + Zustand (this app)
│   └── bridge/          # Express REST + WS proxy to game engine
├── packages/
│   ├── asset-types/     # Shared TypeScript types (CharacterManifest, PipelineStage, etc.)
│   ├── ai-providers/    # ComfyUI client + workflow builders
│   ├── test-harness/    # Browser bridge + WS test server
│   └── ui-kit/          # Shared UI components
└── tests/               # Store tests, Puppeteer UI tests, scenario tests
```

### Key Files

| File | Purpose |
|------|---------|
| `src/store/useSeuratStore.ts` | Zustand store — all state and actions |
| `src/store/types.ts` | AIConfig, TreeSelection, GenerationJob, ClipboardFrame |
| `src/lib/bridge-api.ts` | REST client for bridge (frame images, pass images, manifests) |
| `src/lib/ai-generate.ts` | Prompt builders (frame, row, negative) |
| `src/lib/pose-templates.ts` | OpenPose skeleton data + canvas renderer |
| `src/components/layout/` | TreePane, MainPane, RightPane, BottomPane, Toolbar, StatusBar |
| `src/components/generate/` | FramePipelineGrid, PipelineControls |
| `src/components/shared/PaintEditor.tsx` | Draw/erase/flip/rotate editor overlay |

## Build & Type-Check

```bash
# Type-check Seurat only (fast)
cd tools/apps/seurat && node_modules/.bin/tsc --noEmit

# Build Seurat (tsc + vite bundle)
cd tools/apps/seurat && pnpm build

# Rebuild a dependency package after changing its source
pnpm --filter @vulkan-game-tools/asset-types build
pnpm --filter @vulkan-game-tools/ai-providers build
pnpm --filter @vulkan-game-tools/bridge build
```

After changing `asset-types` or `ai-providers`, you **must** rebuild the package before Seurat's tsc will see the new exports.

After changing bridge code, you **must** rebuild and restart the bridge process — it runs compiled JS, not source.

## Testing

### Test-First Workflow

1. Read existing test files to understand patterns
2. Write test cases for the new behavior
3. Run tests to confirm they fail (or pass for state defaults)
4. Implement the feature
5. Run tests to confirm they pass
6. Commit

### Test Commands

```bash
cd tools/tests

# Store-level tests (unit + scenario, via WS test harness)
pnpm test:seurat              # Requires Seurat dev server running

# Puppeteer UI tests (headless Chrome)
pnpm test:seurat:ui           # Basic DOM tests
pnpm test:seurat:scenario-ui  # Multi-step workflow tests

# ComfyUI integration tests (auto-skip when ComfyUI unavailable)
cd tools/packages/ai-providers
pnpm exec vitest run src/comfyui.integration.test.ts
```

### Test Patterns

**Store tests** (`tests/src/seurat.test.ts`):
- Use `TestClient` WS to dispatch actions and query state selectors
- `client.dispatch('actionName', ...args)` — call store action
- `client.getStateSelector('fieldName')` — read state
- Functions are not serialized in `getState()` — test them via dispatch

**Scenario tests** (`tests/src/seurat.scenario.ts`):
- Multi-step workflows (navigate, modify config, verify, restore)
- Always restore state at end of test to avoid polluting other tests

**Puppeteer UI tests** (`tests/src/seurat-ui-scenario.test.ts`):
- Inject manifest via `client.dispatch('selectCharacterDirect', manifest)`
- Set tree selection via `client.dispatch('setTreeSelection', { kind, ... })`
- Query DOM with `page.$('[data-testid="..."]')`
- Browser must load page BEFORE connecting TestClient (browser bridge establishes first)

**ComfyUI integration tests** (`ai-providers/src/comfyui.integration.test.ts`):
- Vitest, auto-skip when ComfyUI not reachable
- Generate a reference image in `beforeAll`, reuse across tests

### Adding data-testid

When adding UI components that need test coverage, add `data-testid` attributes:
```tsx
<div data-testid="pipeline-grid">
<div data-testid={`pipeline-row-${frame.index}`}>
<button data-testid="run-pass1-btn">
```

## Coding Conventions

### React Components
- **Inline styles** via `const styles: Record<string, React.CSSProperties>` at bottom of file
- **No external UI library** — all components are hand-built
- **Monospace dark theme** — `fontFamily: 'monospace'`, backgrounds `#0e0e1a`–`#161628`, borders `#2a2a3a`
- **Hooks must be above early returns** — React requires consistent hook call order

### Zustand Store
- All state and actions in a single `useSeuratStore` created with `create<SeuratState>()()`
- Use `set()` for synchronous updates, `get()` for reading inside actions
- Expose fine-grained selectors: `useSeuratStore((s) => s.specificField)`
- Async actions use `async` functions in the store, manage loading state locally in components

### Types
- Shared types go in `packages/asset-types` — rebuild after changes
- Store-specific types go in `src/store/types.ts`
- Use `PipelineStage` for frame pipeline tracking: `'pending' | 'pass1' | 'pass1_edited' | 'pass2' | 'pass2_edited' | 'pass3'`

### Bridge API
- Client functions in `src/lib/bridge-api.ts`
- Binary data sent as base64 JSON: `{ data: "<base64>" }` with `Content-Type: application/json`
- Bridge reads binary via `readBinaryBody()` which handles both raw and base64 JSON

### Pipeline Grid Layout
- Uses CSS Grid (`display: grid`) with `gridTemplateColumns` for header/row alignment
- Template: `60px repeat(N, 1fr)` where N = number of columns
- Both header and rows must use the same grid template

## Common Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| `Module has no exported member` | Package not rebuilt after source change | `pnpm --filter <pkg> build` |
| Bridge returns 404 on new endpoints | Bridge running old compiled code | Rebuild and restart bridge |
| React "Rendered more hooks" error | `useEffect`/`useState` called after early `return` | Move all hooks above conditional returns |
| Puppeteer "Ping failed" | TestClient connects before browser loads page | Open page first, then connect TestClient |
| `OffscreenCanvas` not available | Running in Node.js instead of browser | Client-side canvas ops only work in browser context |
| Pass image 404 from client | Vite proxy not forwarding to bridge | Check bridge is running on port 9101 |
