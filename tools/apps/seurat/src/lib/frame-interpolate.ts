/**
 * Client-side frame interpolation via canvas alpha blending.
 *
 * Produces `steps` in-between frames for each adjacent pair (A, B)
 * using simple crossfade (globalAlpha).  Fast, instant feedback.
 */
export async function blendInterpolate(
  frameA: Uint8Array,
  frameB: Uint8Array,
  steps: number,
): Promise<Uint8Array[]> {
  const [bmpA, bmpB] = await Promise.all([
    createImageBitmap(new Blob([frameA as BlobPart], { type: 'image/png' })),
    createImageBitmap(new Blob([frameB as BlobPart], { type: 'image/png' })),
  ]);

  const w = bmpA.width;
  const h = bmpA.height;
  const results: Uint8Array[] = [];

  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1); // e.g. steps=2 → t = 1/3, 2/3
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;

    // Draw frame A at full opacity
    ctx.globalAlpha = 1.0;
    ctx.drawImage(bmpA, 0, 0);

    // Overlay frame B at interpolation ratio
    ctx.globalAlpha = t;
    ctx.drawImage(bmpB, 0, 0);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    results.push(new Uint8Array(await blob.arrayBuffer()));
  }

  bmpA.close();
  bmpB.close();
  return results;
}
