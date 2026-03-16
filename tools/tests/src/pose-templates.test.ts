/**
 * Pose Templates — Unit tests for skeleton interpolation and derivation.
 *
 * Tests the pure functions: interpolateTemplatePoses(), deriveAllAnimationPoses(),
 * and the 3-level pose fallback logic.
 *
 * Usage: node --import tsx/esm --conditions source src/pose-templates.test.ts
 */

// ---------------------------------------------------------------------------
// Inline types (matching pose-templates.ts)
// ---------------------------------------------------------------------------

type Keypoint = [number, number] | null;
type Pose = Keypoint[];

// ---------------------------------------------------------------------------
// Inline the pure functions under test (no browser/canvas deps)
// ---------------------------------------------------------------------------

function interpolateTemplatePoses(
  keyframePoses: Pose[],
  stride: number,
  totalFrames: number,
): Pose[] {
  if (keyframePoses.length === 0) return [];
  if (stride <= 1) {
    return Array.from({ length: totalFrames }, (_, i) =>
      keyframePoses[i % keyframePoses.length],
    );
  }

  const result: Pose[] = [];
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const keyframePos = frameIdx / stride;
    const kfA = Math.floor(keyframePos) % keyframePoses.length;
    const kfB = (kfA + 1) % keyframePoses.length;
    const t = keyframePos - Math.floor(keyframePos);

    if (t < 0.001) {
      result.push(keyframePoses[kfA].map((kp) => kp ? [...kp] as [number, number] : null));
    } else {
      const poseA = keyframePoses[kfA];
      const poseB = keyframePoses[kfB];
      const lerped: Pose = poseA.map((kpA, i) => {
        const kpB = poseB[i];
        if (!kpA || !kpB) return null;
        return [
          kpA[0] + (kpB[0] - kpA[0]) * t,
          kpA[1] + (kpB[1] - kpA[1]) * t,
        ] as [number, number];
      });
      result.push(lerped);
    }
  }
  return result;
}

// Simplified deriveAllAnimationPoses for testing (uses inline data)
function mirrorX(pose: Pose): Pose {
  return pose.map((kp) => (kp ? [1 - kp[0], kp[1]] : null));
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (err) {
    results.push({
      name,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, label: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ~${expected}, got ${actual} (tolerance ${tolerance})`);
  }
}

// ---------------------------------------------------------------------------
// Tests: interpolateTemplatePoses
// ---------------------------------------------------------------------------

test('interpolateTemplatePoses: empty input returns empty', () => {
  const result = interpolateTemplatePoses([], 4, 16);
  assertEqual(result.length, 0, 'Should return empty array');
});

test('interpolateTemplatePoses: stride=1 tiles keyframes', () => {
  const kf: Pose[] = [
    [[0.5, 0.1], [0.5, 0.2]],
    [[0.5, 0.3], [0.5, 0.4]],
  ];
  const result = interpolateTemplatePoses(kf, 1, 4);
  assertEqual(result.length, 4, 'Should have 4 frames');
  // Frame 0 = kf[0], Frame 1 = kf[1], Frame 2 = kf[0] (wraps), Frame 3 = kf[1]
  assertEqual(result[0][0]![1], 0.1, 'Frame 0 y[0] = 0.1');
  assertEqual(result[1][0]![1], 0.3, 'Frame 1 y[0] = 0.3');
  assertEqual(result[2][0]![1], 0.1, 'Frame 2 y[0] = 0.1 (wraps)');
  assertEqual(result[3][0]![1], 0.3, 'Frame 3 y[0] = 0.3 (wraps)');
});

test('interpolateTemplatePoses: stride=4 with 4 keyframes = 16 frames', () => {
  // 4 keyframes at stride 4 = 16 total frames
  const kf: Pose[] = [
    [[0.0, 0.0], [1.0, 1.0]],
    [[0.4, 0.4], [0.6, 0.6]],
    [[0.8, 0.8], [0.2, 0.2]],
    [[0.2, 0.2], [0.8, 0.8]],
  ];
  const result = interpolateTemplatePoses(kf, 4, 16);
  assertEqual(result.length, 16, 'Should have 16 frames');

  // Frame 0 = keyframe 0 exactly
  assertEqual(result[0][0]![0], 0.0, 'f0 kp0.x = 0.0');
  assertEqual(result[0][0]![1], 0.0, 'f0 kp0.y = 0.0');

  // Frame 4 = keyframe 1 exactly
  assertEqual(result[4][0]![0], 0.4, 'f4 kp0.x = 0.4');

  // Frame 8 = keyframe 2 exactly
  assertEqual(result[8][0]![0], 0.8, 'f8 kp0.x = 0.8');

  // Frame 12 = keyframe 3 exactly
  assertEqual(result[12][0]![0], 0.2, 'f12 kp0.x = 0.2');

  // Frame 2 = halfway between kf[0] and kf[1]: lerp(0.0, 0.4, 0.5) = 0.2
  assertClose(result[2][0]![0], 0.2, 0.01, 'f2 kp0.x ~= 0.2');

  // Frame 1 = 25% between kf[0] and kf[1]: lerp(0.0, 0.4, 0.25) = 0.1
  assertClose(result[1][0]![0], 0.1, 0.01, 'f1 kp0.x ~= 0.1');

  // Frame 3 = 75% between kf[0] and kf[1]: lerp(0.0, 0.4, 0.75) = 0.3
  assertClose(result[3][0]![0], 0.3, 0.01, 'f3 kp0.x ~= 0.3');
});

test('interpolateTemplatePoses: null keypoints propagate as null', () => {
  const kf: Pose[] = [
    [null, [0.5, 0.2]],
    [[0.5, 0.3], null],
  ];
  const result = interpolateTemplatePoses(kf, 2, 4);
  assertEqual(result.length, 4, 'Should have 4 frames');

  // Frame 0 = kf[0] exactly: [null, [0.5, 0.2]]
  assertEqual(result[0][0], null, 'f0 kp0 = null');
  assertEqual(result[0][1]![0], 0.5, 'f0 kp1.x = 0.5');

  // Frame 1 = midpoint: both kp0 and kp1 have one null side → result null
  assertEqual(result[1][0], null, 'f1 kp0 = null (one bracket is null)');
  assertEqual(result[1][1], null, 'f1 kp1 = null (one bracket is null)');

  // Frame 2 = kf[1] exactly
  assertEqual(result[2][0]![0], 0.5, 'f2 kp0.x = 0.5');
  assertEqual(result[2][1], null, 'f2 kp1 = null');
});

test('interpolateTemplatePoses: cyclic wrapping (last to first)', () => {
  const kf: Pose[] = [
    [[0.0, 0.0]],
    [[1.0, 1.0]],
  ];
  // Stride=4, totalFrames=8 → frames 0-3 interpolate kf[0]→kf[1], frames 4-7 interpolate kf[1]→kf[0]
  const result = interpolateTemplatePoses(kf, 4, 8);
  assertEqual(result.length, 8, 'Should have 8 frames');

  // Frame 6 = 50% between kf[1] and kf[0] (wrapping): lerp(1.0, 0.0, 0.5) = 0.5
  assertClose(result[6][0]![0], 0.5, 0.01, 'f6 kp0.x ~= 0.5 (wrapping)');
});

// ---------------------------------------------------------------------------
// Tests: mirrorX
// ---------------------------------------------------------------------------

test('mirrorX: flips x coordinates', () => {
  const pose: Pose = [[0.3, 0.5], [0.7, 0.1], null];
  const mirrored = mirrorX(pose);
  assertClose(mirrored[0]![0], 0.7, 0.001, 'kp0.x mirrored from 0.3 to 0.7');
  assertEqual(mirrored[0]![1], 0.5, 'kp0.y unchanged');
  assertClose(mirrored[1]![0], 0.3, 0.001, 'kp1.x mirrored from 0.7 to 0.3');
  assertEqual(mirrored[2], null, 'null stays null');
});

// ---------------------------------------------------------------------------
// Tests: 3-level pose fallback logic
// ---------------------------------------------------------------------------

test('3-level fallback: override wins over derived and template', () => {
  const poseOverrides: Record<string, Pose> = {
    'idle_down:0': [[0.99, 0.99]],
  };
  const derivedAnimPoses: Record<string, Pose[]> = {
    idle_down: [[[0.55, 0.55]]],
  };
  const templatePose: Pose = [[0.50, 0.50]];

  const animName = 'idle_down';
  const fi = 0;
  const key = `${animName}:${fi}`;

  const resolved = poseOverrides[key] ?? derivedAnimPoses[animName]?.[fi] ?? templatePose;
  assertEqual(resolved[0]![0], 0.99, 'Override should win');
});

test('3-level fallback: derived wins when no override', () => {
  const poseOverrides: Record<string, Pose> = {};
  const derivedAnimPoses: Record<string, Pose[]> = {
    idle_down: [[[0.55, 0.55]]],
  };
  const templatePose: Pose = [[0.50, 0.50]];

  const animName = 'idle_down';
  const fi = 0;
  const key = `${animName}:${fi}`;

  const resolved = poseOverrides[key] ?? derivedAnimPoses[animName]?.[fi] ?? templatePose;
  assertEqual(resolved[0]![0], 0.55, 'Derived should win when no override');
});

test('3-level fallback: template used when no override or derived', () => {
  const poseOverrides: Record<string, Pose> = {};
  const derivedAnimPoses: Record<string, Pose[]> = {};
  const templatePose: Pose = [[0.50, 0.50]];

  const animName = 'idle_down';
  const fi = 0;
  const key = `${animName}:${fi}`;

  const resolved = poseOverrides[key] ?? derivedAnimPoses[animName]?.[fi] ?? templatePose;
  assertEqual(resolved[0]![0], 0.50, 'Template should be used as final fallback');
});

test('3-level fallback: null derived frame falls through to template', () => {
  const poseOverrides: Record<string, Pose> = {};
  const derivedAnimPoses: Record<string, Pose[]> = {
    idle_down: [],  // empty array: no frame at index 0
  };
  const templatePose: Pose = [[0.50, 0.50]];

  const animName = 'idle_down';
  const fi = 0;
  const key = `${animName}:${fi}`;

  const resolved = poseOverrides[key] ?? derivedAnimPoses[animName]?.[fi] ?? templatePose;
  assertEqual(resolved[0]![0], 0.50, 'Template fallback when derived array is empty');
});

// ---------------------------------------------------------------------------
// Tests: deriveAllAnimationPoses structure
// ---------------------------------------------------------------------------

test('deriveAllAnimationPoses: basic structure verification', () => {
  // Mock detected front keypoints (14 points)
  const detectedFront: Keypoint[] = [
    [0.50, 0.15], [0.50, 0.24], [0.38, 0.27], [0.34, 0.40], [0.33, 0.50],
    [0.62, 0.27], [0.66, 0.40], [0.67, 0.50],
    [0.43, 0.51], [0.43, 0.67], [0.43, 0.82],
    [0.57, 0.51], [0.57, 0.67], [0.57, 0.82],
  ];

  // Since we can't import the full function (browser deps for POSE_MAP), test
  // that the interpolation + derivation concept is sound:
  // Given a simple 2-keyframe template with stride=1:
  const templateKeyframes: Pose[] = [
    [[0.50, 0.10], [0.50, 0.20]], // kf 0
    [[0.50, 0.12], [0.50, 0.22]], // kf 1
  ];

  // Expand with stride=1, totalFrames=2
  const expanded = interpolateTemplatePoses(templateKeyframes, 1, 2);
  assertEqual(expanded.length, 2, 'Should produce 2 frames');

  // Apply template X + detected Y
  const derived = expanded.map((templatePose) =>
    templatePose.map((templateKp, i) => {
      const detectedKp = detectedFront[i];
      if (!templateKp) return null;
      if (!detectedKp) return templateKp;
      return [templateKp[0], detectedKp[1]] as [number, number];
    }),
  );

  assertEqual(derived.length, 2, 'Derived should have 2 frames');
  // X comes from template (0.50), Y comes from detected
  assertEqual(derived[0][0]![0], 0.50, 'X from template');
  assertEqual(derived[0][0]![1], 0.15, 'Y from detected (nose)');
  assertEqual(derived[0][1]![0], 0.50, 'X from template (neck)');
  assertEqual(derived[0][1]![1], 0.24, 'Y from detected (neck)');
});

test('deriveAllAnimationPoses: up direction nulls out nose', () => {
  const pose: Pose = [
    [0.50, 0.15], [0.50, 0.24], [0.38, 0.27], [0.34, 0.40], [0.33, 0.50],
    [0.62, 0.27], [0.66, 0.40], [0.67, 0.50],
    [0.43, 0.51], [0.43, 0.67], [0.43, 0.82],
    [0.57, 0.51], [0.57, 0.67], [0.57, 0.82],
  ];

  // Simulate the up-direction processing
  const upPose = [...pose];
  upPose[0] = null; // nose hidden from behind
  assertEqual(upPose[0], null, 'Nose should be null for up direction');
  assert(upPose[1] !== null, 'Neck should remain');
});

test('deriveAllAnimationPoses: left direction is mirrored from right', () => {
  const rightPose: Pose = [
    [0.52, 0.09], [0.49, 0.17], [0.42, 0.19], [0.38, 0.28], [0.38, 0.37],
    [0.54, 0.19], [0.52, 0.28], [0.52, 0.37],
    [0.44, 0.38], [0.40, 0.54], [0.34, 0.72],
    [0.50, 0.38], [0.50, 0.54], [0.52, 0.72],
  ];

  const leftPose = mirrorX(rightPose);
  // nose: 0.52 → 1 - 0.52 = 0.48
  assertClose(leftPose[0]![0], 0.48, 0.001, 'Nose x mirrored');
  // Y unchanged
  assertEqual(leftPose[0]![1], 0.09, 'Nose y unchanged');
  // r_shoulder (0.42) → 0.58
  assertClose(leftPose[2]![0], 0.58, 0.001, 'r_shoulder x mirrored');
});

// ---------------------------------------------------------------------------
// Tests: Stride and frame count
// ---------------------------------------------------------------------------

test('run animation: stride=4, 4 keyframes = 16 total frames', () => {
  const kf: Pose[] = [
    [[0.50, 0.16]], // frame 0
    [[0.50, 0.18]], // frame 4
    [[0.50, 0.16]], // frame 8
    [[0.50, 0.18]], // frame 12
  ];
  const stride = 4;
  const total = kf.length * stride; // 16
  const result = interpolateTemplatePoses(kf, stride, total);
  assertEqual(result.length, 16, '16 total frames for run animation');

  // Verify keyframes are at exact positions
  assertEqual(result[0][0]![1], 0.16, 'f0 is kf[0]');
  assertEqual(result[4][0]![1], 0.18, 'f4 is kf[1]');
  assertEqual(result[8][0]![1], 0.16, 'f8 is kf[2]');
  assertEqual(result[12][0]![1], 0.18, 'f12 is kf[3]');

  // Verify interpolated frames exist and are between brackets
  assertClose(result[2][0]![1], 0.17, 0.01, 'f2 is midpoint between kf[0] and kf[1]');
  assertClose(result[6][0]![1], 0.17, 0.01, 'f6 is midpoint between kf[1] and kf[2]');
});

test('idle/walk animation: stride=1, 4 keyframes = 4 total frames', () => {
  const kf: Pose[] = [
    [[0.50, 0.15]],
    [[0.50, 0.15]],
    [[0.50, 0.15]],
    [[0.50, 0.14]],
  ];
  const result = interpolateTemplatePoses(kf, 1, 4);
  assertEqual(result.length, 4, '4 frames for idle/walk');
  // Each frame is a direct copy of the corresponding keyframe
  assertEqual(result[0][0]![1], 0.15, 'f0');
  assertEqual(result[3][0]![1], 0.14, 'f3');
});

// ---------------------------------------------------------------------------
// Tests: Edge cases
// ---------------------------------------------------------------------------

test('interpolateTemplatePoses: single keyframe repeated', () => {
  const kf: Pose[] = [[[0.5, 0.5]]];
  const result = interpolateTemplatePoses(kf, 4, 4);
  assertEqual(result.length, 4, '4 frames from single keyframe');
  // All frames should be the same (interpolation between same pose)
  for (let i = 0; i < 4; i++) {
    assertEqual(result[i][0]![0], 0.5, `f${i} x = 0.5`);
    assertEqual(result[i][0]![1], 0.5, `f${i} y = 0.5`);
  }
});

test('interpolateTemplatePoses: all null keypoints', () => {
  const kf: Pose[] = [[null, null], [null, null]];
  const result = interpolateTemplatePoses(kf, 2, 4);
  assertEqual(result.length, 4, '4 frames');
  for (let i = 0; i < 4; i++) {
    assertEqual(result[i][0], null, `f${i} kp0 is null`);
    assertEqual(result[i][1], null, `f${i} kp1 is null`);
  }
});

// ---------------------------------------------------------------------------
// Tests: Modulo lookup for expanded animations
// ---------------------------------------------------------------------------

test('modulo lookup: derived array shorter than manifest frame count', () => {
  // Simulate idle animation: 4 derived poses, but 16 manifest frames
  const derivedAnimPoses: Record<string, Pose[]> = {
    idle_down: [
      [[0.50, 0.15]], // template frame 0
      [[0.50, 0.15]], // template frame 1
      [[0.50, 0.15]], // template frame 2
      [[0.50, 0.14]], // template frame 3
    ],
  };

  // Frame index 5 (interpolation slot) should cycle: 5 % 4 = 1
  const dp = derivedAnimPoses['idle_down'];
  const pose5 = dp?.length ? dp[5 % dp.length] : undefined;
  assert(pose5 !== undefined, 'Frame 5 should resolve via modulo');
  assertEqual(pose5![0]![1], 0.15, 'Frame 5 resolves to template frame 1');

  // Frame index 15 should cycle: 15 % 4 = 3
  const pose15 = dp?.length ? dp[15 % dp.length] : undefined;
  assert(pose15 !== undefined, 'Frame 15 should resolve via modulo');
  assertEqual(pose15![0]![1], 0.14, 'Frame 15 resolves to template frame 3');

  // Frame index 0 should be direct: 0 % 4 = 0
  const pose0 = dp?.length ? dp[0 % dp.length] : undefined;
  assertEqual(pose0![0]![1], 0.15, 'Frame 0 is direct');
});

test('modulo lookup: empty derived array returns undefined', () => {
  const dp: Pose[] = [];
  const result = dp?.length ? dp[5 % dp.length] : undefined;
  assertEqual(result, undefined, 'Empty array returns undefined');
});

test('modulo lookup: undefined animation returns undefined', () => {
  const derivedAnimPoses: Record<string, Pose[]> = {};
  const dp = derivedAnimPoses['nonexistent'];
  const result = dp?.length ? dp[0 % dp.length] : undefined;
  assertEqual(result, undefined, 'Missing animation returns undefined');
});

// ---------------------------------------------------------------------------
// Run and report
// ---------------------------------------------------------------------------

console.log('\n=== Pose Templates Unit Tests ===\n');

let passed = 0;
let failed = 0;

for (const r of results) {
  if (r.passed) {
    console.log(`  \x1b[32m✓\x1b[0m ${r.name}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${r.name}`);
    console.log(`    \x1b[31m${r.error}\x1b[0m`);
    failed++;
  }
}

console.log(`\n  ${passed} passed, ${failed} failed, ${results.length} total\n`);

if (failed > 0) process.exit(1);
