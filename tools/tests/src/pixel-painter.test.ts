import { TestRunner, assert, assertEqual } from './qa-runner.js';

export function runPixelPainterTests(runner: TestRunner): void {
  runner.test('Store is accessible', async (client) => {
    const state = await client.getState() as Record<string, unknown>;
    assert(state !== null, 'State should not be null');
    assert('pixels' in state, 'State should have pixels');
    assert('activeTool' in state, 'State should have activeTool');
    assert('manifest' in state, 'State should have manifest');
  });

  runner.test('Manifest is present with correct structure', async (client) => {
    const manifest = await client.getStateSelector('manifest') as Record<string, unknown>;
    assert('tileset' in manifest, 'Manifest should have tileset');
    assert('spritesheet' in manifest, 'Manifest should have spritesheet');
    assert('version' in manifest, 'Manifest should have version');

    const tileset = manifest['tileset'] as Record<string, unknown>;
    assert('tile_width' in tileset, 'Tileset should have tile_width');
    assert('tile_height' in tileset, 'Tileset should have tile_height');
    assert('columns' in tileset, 'Tileset should have columns');
    assert('rows' in tileset, 'Tileset should have rows');
    assert('slots' in tileset, 'Tileset should have slots');

    const spritesheet = manifest['spritesheet'] as Record<string, unknown>;
    assert('frame_width' in spritesheet, 'Spritesheet should have frame_width');
    assert('frame_height' in spritesheet, 'Spritesheet should have frame_height');
    assert('columns' in spritesheet, 'Spritesheet should have columns');
    assert('rows' in spritesheet, 'Spritesheet should have rows');
  });

  runner.test('Set pixel updates canvas data', async (client) => {
    await client.dispatch('pushHistory');
    // Set pixel at (0,0) to red
    await client.dispatch('setPixel', 0, 0, [255, 0, 0, 255]);
    // Push again so undo has a "current" state to revert from
    await client.dispatch('pushHistory');
    const pixels = await client.getStateSelector('pixels') as Record<string, number>;
    // PixelData is a Uint8ClampedArray (16*16*4 = 1024 bytes), serialized as object
    // Pixel (0,0) starts at index 0: RGBA
    assertEqual(pixels[0], 255, 'Pixel R at (0,0)');
    assertEqual(pixels[1], 0, 'Pixel G at (0,0)');
    assertEqual(pixels[2], 0, 'Pixel B at (0,0)');
    assertEqual(pixels[3], 255, 'Pixel A at (0,0)');
  });

  runner.test('Color swap swaps fg/bg', async (client) => {
    const fgBefore = await client.getStateSelector('fgColor') as number[];
    const bgBefore = await client.getStateSelector('bgColor') as number[];
    await client.dispatch('swapColors');
    const fgAfter = await client.getStateSelector('fgColor') as number[];
    const bgAfter = await client.getStateSelector('bgColor') as number[];

    assertEqual(fgAfter[0], bgBefore[0], 'FG R after swap = BG R before');
    assertEqual(bgAfter[0], fgBefore[0], 'BG R after swap = FG R before');

    // Swap back
    await client.dispatch('swapColors');
  });

  runner.test('Mirror mode updates state', async (client) => {
    await client.dispatch('setMirrorMode', 'horizontal');
    let mode = await client.getStateSelector('mirrorMode');
    assertEqual(mode, 'horizontal', 'Mirror mode horizontal');

    await client.dispatch('setMirrorMode', 'vertical');
    mode = await client.getStateSelector('mirrorMode');
    assertEqual(mode, 'vertical', 'Mirror mode vertical');

    await client.dispatch('setMirrorMode', 'both');
    mode = await client.getStateSelector('mirrorMode');
    assertEqual(mode, 'both', 'Mirror mode both');

    await client.dispatch('setMirrorMode', 'none');
    mode = await client.getStateSelector('mirrorMode');
    assertEqual(mode, 'none', 'Mirror mode none');
  });

  runner.test('Undo restores pixel state', async (client) => {
    await client.dispatch('undo');
    const pixels = await client.getStateSelector('pixels') as Record<string, number>;
    // After undo, pixel (0,0) should be back to 0 (the default transparent)
    assertEqual(pixels[0], 0, 'Pixel R at (0,0) after undo');
  });

  runner.test('Redo restores edited pixel', async (client) => {
    await client.dispatch('redo');
    const pixels = await client.getStateSelector('pixels') as Record<string, number>;
    assertEqual(pixels[0], 255, 'Pixel R at (0,0) after redo');
  });

  runner.test('Tool selection works', async (client) => {
    const tools = ['pencil', 'eraser', 'line', 'rect', 'fill', 'eyedropper'] as const;
    for (const tool of tools) {
      await client.dispatch('setActiveTool', tool);
      const current = await client.getStateSelector('activeTool');
      assertEqual(current, tool, `Active tool: ${tool}`);
    }
  });

  runner.test('Edit target switching', async (client) => {
    await client.dispatch('setEditTarget', 'spritesheet');
    let target = await client.getStateSelector('editTarget');
    assertEqual(target, 'spritesheet', 'Edit target: spritesheet');

    await client.dispatch('setEditTarget', 'tileset');
    target = await client.getStateSelector('editTarget');
    assertEqual(target, 'tileset', 'Edit target: tileset');
  });

  runner.test('Zoom updates', async (client) => {
    await client.dispatch('setZoom', 8);
    const zoom = await client.getStateSelector('zoom');
    assertEqual(zoom, 8, 'Zoom value');
    await client.dispatch('setZoom', 1);
  });

  runner.test('Foreground color set', async (client) => {
    await client.dispatch('setFgColor', [0, 128, 255, 255]);
    const fg = await client.getStateSelector('fgColor') as number[];
    assertEqual(fg[0], 0, 'FG R');
    assertEqual(fg[1], 128, 'FG G');
    assertEqual(fg[2], 255, 'FG B');
  });

  runner.test('Manifest settings toggle', async (client) => {
    await client.dispatch('setShowManifestSettings', true);
    let show = await client.getStateSelector('showManifestSettings');
    assertEqual(show, true, 'Settings shown');
    await client.dispatch('setShowManifestSettings', false);
    show = await client.getStateSelector('showManifestSettings');
    assertEqual(show, false, 'Settings hidden');
  });

  // -------------------------------------------------------------------------
  // Heightmap layer tests
  // -------------------------------------------------------------------------

  runner.test('Layer switching', async (client) => {
    await client.dispatch('setActiveLayer', 'heightmap');
    let layer = await client.getStateSelector('activeLayer');
    assertEqual(layer, 'heightmap', 'Active layer: heightmap');

    await client.dispatch('setActiveLayer', 'diffuse');
    layer = await client.getStateSelector('activeLayer');
    assertEqual(layer, 'diffuse', 'Active layer: diffuse');
  });

  runner.test('Height value set', async (client) => {
    await client.dispatch('setHeightValue', 200);
    let v = await client.getStateSelector('heightValue') as number;
    assertEqual(v, 200, 'Height value 200');

    await client.dispatch('setHeightValue', 300);
    v = await client.getStateSelector('heightValue') as number;
    assertEqual(v, 255, 'Height value clamped to 255');

    await client.dispatch('setHeightValue', -10);
    v = await client.getStateSelector('heightValue') as number;
    assertEqual(v, 0, 'Height value clamped to 0');

    // Reset
    await client.dispatch('setHeightValue', 128);
  });

  runner.test('Heightmap pixel set', async (client) => {
    await client.dispatch('pushHistory');
    await client.dispatch('setHeightmapPixel', 5, 5, 200);
    const hm = (await client.getStateSelector('heightmapPixels')) as Record<string, number>;
    const idx = 5 * 16 + 5;
    assertEqual(hm[idx], 200, 'Heightmap pixel at (5,5)');
  });

  runner.test('Normal preview toggle', async (client) => {
    await client.dispatch('setShowNormalPreview', true);
    let show = await client.getStateSelector('showNormalPreview');
    assertEqual(show, true, 'Normal preview shown');

    await client.dispatch('setShowNormalPreview', false);
    show = await client.getStateSelector('showNormalPreview');
    assertEqual(show, false, 'Normal preview hidden');
  });

  runner.test('Heightmap opacity', async (client) => {
    await client.dispatch('setHeightmapOpacity', 0.7);
    const opacity = await client.getStateSelector('heightmapOpacity') as number;
    // Floating point comparison with tolerance
    assert(Math.abs(opacity - 0.7) < 0.01, `Opacity is ~0.7, got ${opacity}`);

    await client.dispatch('setHeightmapOpacity', 0.5); // reset
  });

  runner.test('setManifest updates manifest', async (client) => {
    const orig = await client.getStateSelector('manifest') as Record<string, unknown>;
    const tileset = orig['tileset'] as Record<string, unknown>;
    assertEqual(tileset['tile_width'], 16, 'Original tile width');

    // Modify
    const modified = JSON.parse(JSON.stringify(orig));
    modified['tileset']['columns'] = 4;
    await client.dispatch('setManifest', modified);

    const updated = await client.getStateSelector('manifest') as Record<string, unknown>;
    const updatedTileset = updated['tileset'] as Record<string, unknown>;
    assertEqual(updatedTileset['columns'], 4, 'Columns changed to 4');

    // Restore
    await client.dispatch('setManifest', orig);
    const restored = await client.getStateSelector('manifest') as Record<string, unknown>;
    const restoredTileset = restored['tileset'] as Record<string, unknown>;
    assertEqual(restoredTileset['columns'], 8, 'Columns restored to 8');
  });
}
