/**
 * Unit tests for Bricklayer store (collision grid, nav zones) and scene export.
 *
 * Run: pnpm test:bricklayer-store
 */

// Re-implement minimal types and functions inline to avoid importing from
// the bricklayer app (which has React/Three.js/Zustand dependencies).

// ── Types (mirrors store/types.ts) ──

type VoxelKey = `${number},${number},${number}`;
interface Voxel { color: [number, number, number, number]; }

interface CollisionGridData {
  width: number;
  height: number;
  cell_size: number;
  solid: boolean[];
  elevation: number[];
  nav_zone: number[];
}

interface StaticLight {
  id: string;
  position: [number, number];
  radius: number;
  height: number;
  color: [number, number, number];
  intensity: number;
}

interface NpcData {
  id: string;
  name: string;
  position: [number, number, number];
  tint: [number, number, number, number];
  facing: string;
  reverse_facing: string;
  patrol_interval: number;
  patrol_speed: number;
  waypoints: [number, number][];
  waypoint_pause: number;
  dialog: { speaker_key: string; text_key: string }[];
  light_color: [number, number, number, number];
  light_radius: number;
  aura_color_start: [number, number, number, number];
  aura_color_end: [number, number, number, number];
  character_id: string;
  script_module: string;
  script_class: string;
}

interface PortalData {
  id: string;
  position: [number, number];
  size: [number, number];
  target_scene: string;
  spawn_position: [number, number, number];
  spawn_facing: string;
}

interface EmitterConfig {
  spawn_rate: number;
  particle_lifetime_min: number;
  particle_lifetime_max: number;
  velocity_min: [number, number];
  velocity_max: [number, number];
  acceleration: [number, number];
  size_min: number;
  size_max: number;
  size_end_scale: number;
  color_start: [number, number, number, number];
  color_end: [number, number, number, number];
  tile: string;
  z: number;
  spawn_offset_min: [number, number];
  spawn_offset_max: [number, number];
}

interface BackgroundLayer {
  id: string;
  texture: string;
  z: number;
  parallax_factor: number;
  quad_width: number;
  quad_height: number;
  uv_repeat_x: number;
  uv_repeat_y: number;
  tint: [number, number, number, number];
  wall: boolean;
  wall_y_offset: number;
}

interface WeatherData {
  enabled: boolean;
  type: string;
  emitter: EmitterConfig;
  ambient_override: [number, number, number, number];
  fog_density: number;
  fog_color: [number, number, number];
  transition_speed: number;
}

interface DayNightData {
  enabled: boolean;
  cycle_speed: number;
  initial_time: number;
  keyframes: {
    time: number;
    ambient: [number, number, number, number];
    torch_intensity: number;
  }[];
}

interface GaussianSplatConfig {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  render_width: number;
  render_height: number;
  scale_multiplier: number;
  background_image: string;
  parallax: {
    azimuth_range: number;
    elevation_min: number;
    elevation_max: number;
    distance_range: number;
    parallax_strength: number;
  };
}

interface PlayerData {
  position: [number, number, number];
  tint: [number, number, number, number];
  facing: string;
  character_id: string;
}

interface PlacedObjectData {
  id: string;
  ply_file: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  is_static: boolean;
  character_manifest: string;
}

interface BricklayerFile {
  version: number;
  gridWidth: number;
  gridDepth: number;
  voxels: { x: number; y: number; z: number; r: number; g: number; b: number; a: number }[];
  collision: string[];
  collisionGridData?: CollisionGridData;
  nav_zone_names?: string[];
  scene: {
    ambientColor: [number, number, number, number];
    staticLights: StaticLight[];
    npcs: NpcData[];
    portals: PortalData[];
    player: PlayerData;
    backgroundLayers: BackgroundLayer[];
    torchEmitter: EmitterConfig;
    torchPositions: [number, number][];
    footstepEmitter: EmitterConfig;
    npcAuraEmitter: EmitterConfig;
    weather: WeatherData;
    dayNight: DayNightData;
    gaussianSplat: GaussianSplatConfig;
    placedObjects: PlacedObjectData[];
  };
}

// Minimal state interface matching fields used by exportSceneJson
interface SceneState {
  voxels: Map<VoxelKey, Voxel>;
  gridWidth: number;
  gridDepth: number;
  ambientColor: [number, number, number, number];
  staticLights: StaticLight[];
  npcs: NpcData[];
  portals: PortalData[];
  placedObjects: PlacedObjectData[];
  player: PlayerData;
  backgroundLayers: BackgroundLayer[];
  torchEmitter: EmitterConfig;
  torchPositions: [number, number][];
  footstepEmitter: EmitterConfig;
  npcAuraEmitter: EmitterConfig;
  weather: WeatherData;
  dayNight: DayNightData;
  gaussianSplat: GaussianSplatConfig;
  collisionGridData: CollisionGridData | null;
  navZoneNames: string[];
}

// ── Utility functions (mirrors voxelUtils.ts) ──

function voxelKey(x: number, y: number, z: number): VoxelKey {
  return `${x},${y},${z}`;
}

function parseKey(key: VoxelKey): [number, number, number] {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// ── Collision grid helpers (mirrors store actions) ──

function initCollisionGrid(width: number, height: number, cellSize: number): CollisionGridData {
  const count = width * height;
  return {
    width,
    height,
    cell_size: cellSize,
    solid: new Array(count).fill(false),
    elevation: new Array(count).fill(0),
    nav_zone: new Array(count).fill(0),
  };
}

function toggleCellSolid(grid: CollisionGridData, x: number, z: number): CollisionGridData {
  const idx = z * grid.width + x;
  if (idx < 0 || idx >= grid.solid.length) return grid;
  const solid = [...grid.solid];
  solid[idx] = !solid[idx];
  return { ...grid, solid };
}

function setCellElevation(grid: CollisionGridData, x: number, z: number, value: number): CollisionGridData {
  const idx = z * grid.width + x;
  if (idx < 0 || idx >= grid.elevation.length) return grid;
  const elevation = [...grid.elevation];
  elevation[idx] = value;
  return { ...grid, elevation };
}

function setCellNavZone(grid: CollisionGridData, x: number, z: number, zone: number): CollisionGridData {
  const idx = z * grid.width + x;
  if (idx < 0 || idx >= grid.nav_zone.length) return grid;
  const nav_zone = [...grid.nav_zone];
  nav_zone[idx] = zone;
  return { ...grid, nav_zone };
}

// ── Scene export (mirrors lib/sceneExport.ts) ──

function exportSceneJson(state: SceneState): Record<string, unknown> {
  const scene: Record<string, unknown> = {
    ambient_color: state.ambientColor,
  };

  if (state.staticLights.length > 0) {
    scene.static_lights = state.staticLights.map((l) => ({
      position: l.position,
      radius: l.radius,
      height: l.height,
      color: l.color,
      intensity: l.intensity,
    }));
  }

  if (state.npcs.length > 0) {
    scene.npcs = state.npcs.map((n) => ({
      name: n.name,
      position: n.position,
      tint: n.tint,
      facing: n.facing,
      reverse_facing: n.reverse_facing,
      patrol_interval: n.patrol_interval,
      patrol_speed: n.patrol_speed,
      waypoints: n.waypoints,
      waypoint_pause: n.waypoint_pause,
      dialog: n.dialog,
      light_color: n.light_color,
      light_radius: n.light_radius,
      aura_color_start: n.aura_color_start,
      aura_color_end: n.aura_color_end,
      character_id: n.character_id,
      script_module: n.script_module,
      script_class: n.script_class,
    }));
  }

  if (state.portals.length > 0) {
    scene.portals = state.portals.map((p) => ({
      position: p.position,
      size: p.size,
      target_scene: p.target_scene,
      spawn_position: p.spawn_position,
      spawn_facing: p.spawn_facing,
    }));
  }

  scene.player_position = state.player.position;
  scene.player_tint = state.player.tint;
  scene.player_facing = state.player.facing;
  if (state.player.character_id) {
    scene.player_character_id = state.player.character_id;
  }

  if (state.backgroundLayers.length > 0) {
    scene.background_layers = state.backgroundLayers.map((l) => ({
      texture: l.texture,
      z: l.z,
      parallax_factor: l.parallax_factor,
      quad_width: l.quad_width,
      quad_height: l.quad_height,
      uv_repeat_x: l.uv_repeat_x,
      uv_repeat_y: l.uv_repeat_y,
      tint: l.tint,
      wall: l.wall,
      wall_y_offset: l.wall_y_offset,
    }));
  }

  scene.torch_emitter = state.torchEmitter;
  if (state.torchPositions.length > 0) {
    scene.torch_positions = state.torchPositions;
  }
  scene.footstep_emitter = state.footstepEmitter;
  scene.npc_aura_emitter = state.npcAuraEmitter;

  if (state.weather.enabled) {
    scene.weather = {
      type: state.weather.type,
      emitter: state.weather.emitter,
      ambient_override: state.weather.ambient_override,
      fog_density: state.weather.fog_density,
      fog_color: state.weather.fog_color,
      transition_speed: state.weather.transition_speed,
    };
  }

  if (state.dayNight.enabled) {
    scene.day_night = {
      cycle_speed: state.dayNight.cycle_speed,
      initial_time: state.dayNight.initial_time,
      keyframes: state.dayNight.keyframes,
    };
  }

  scene.gaussian_splat = {
    ply_file: 'map.ply',
    camera: state.gaussianSplat.camera,
    render_width: state.gaussianSplat.render_width,
    render_height: state.gaussianSplat.render_height,
    scale_multiplier: state.gaussianSplat.scale_multiplier,
    background_image: state.gaussianSplat.background_image,
    parallax: state.gaussianSplat.parallax,
  };

  if (state.placedObjects.length > 0) {
    scene.placed_objects = state.placedObjects.map((obj) => ({
      id: obj.id,
      ply_file: obj.ply_file,
      position: obj.position,
      rotation: obj.rotation,
      scale: obj.scale,
      is_static: obj.is_static,
      ...(obj.character_manifest ? { character_manifest: obj.character_manifest } : {}),
    }));
  }

  if (state.collisionGridData) {
    const g = state.collisionGridData;
    scene.collision = {
      width: g.width,
      height: g.height,
      cell_size: g.cell_size,
      solid: g.solid,
      elevation: g.elevation,
      nav_zone: g.nav_zone,
    };
  }

  return scene;
}

// ── Save / Load helpers (mirrors store saveProject / loadProject) ──

function saveProject(state: SceneState): BricklayerFile {
  const voxelArr: BricklayerFile['voxels'] = [];
  for (const [key, vox] of state.voxels) {
    const [x, y, z] = parseKey(key);
    voxelArr.push({ x, y, z, r: vox.color[0], g: vox.color[1], b: vox.color[2], a: vox.color[3] });
  }
  return {
    version: 1,
    gridWidth: state.gridWidth,
    gridDepth: state.gridDepth,
    voxels: voxelArr,
    collision: [],
    collisionGridData: state.collisionGridData ?? undefined,
    nav_zone_names: state.navZoneNames.length > 0 ? state.navZoneNames : undefined,
    scene: {
      ambientColor: state.ambientColor,
      staticLights: state.staticLights,
      npcs: state.npcs,
      portals: state.portals,
      player: state.player,
      backgroundLayers: state.backgroundLayers,
      torchEmitter: state.torchEmitter,
      torchPositions: state.torchPositions,
      footstepEmitter: state.footstepEmitter,
      npcAuraEmitter: state.npcAuraEmitter,
      weather: state.weather,
      dayNight: state.dayNight,
      gaussianSplat: state.gaussianSplat,
      placedObjects: state.placedObjects,
    },
  };
}

function loadProject(data: BricklayerFile): SceneState {
  const voxels = new Map<VoxelKey, Voxel>();
  for (const v of data.voxels) {
    voxels.set(voxelKey(v.x, v.y, v.z), { color: [v.r, v.g, v.b, v.a] });
  }
  return {
    voxels,
    gridWidth: data.gridWidth,
    gridDepth: data.gridDepth,
    collisionGridData: data.collisionGridData ?? null,
    navZoneNames: data.nav_zone_names ?? [],
    ambientColor: data.scene.ambientColor,
    staticLights: data.scene.staticLights,
    npcs: data.scene.npcs,
    portals: data.scene.portals,
    placedObjects: data.scene.placedObjects ?? [],
    player: data.scene.player,
    backgroundLayers: data.scene.backgroundLayers,
    torchEmitter: data.scene.torchEmitter,
    torchPositions: data.scene.torchPositions,
    footstepEmitter: data.scene.footstepEmitter,
    npcAuraEmitter: data.scene.npcAuraEmitter,
    weather: data.scene.weather,
    dayNight: data.scene.dayNight,
    gaussianSplat: data.scene.gaussianSplat,
  };
}

// ── Default factories ──

function defaultEmitter(): EmitterConfig {
  return {
    spawn_rate: 10,
    particle_lifetime_min: 0.5,
    particle_lifetime_max: 1.5,
    velocity_min: [-0.5, -0.5],
    velocity_max: [0.5, 0.5],
    acceleration: [0, 0],
    size_min: 1,
    size_max: 2,
    size_end_scale: 0.5,
    color_start: [1, 1, 1, 1],
    color_end: [1, 1, 1, 0],
    tile: '',
    z: 0,
    spawn_offset_min: [0, 0],
    spawn_offset_max: [0, 0],
  };
}

function defaultWeather(): WeatherData {
  return {
    enabled: false,
    type: 'rain',
    emitter: defaultEmitter(),
    ambient_override: [0.3, 0.3, 0.4, 1],
    fog_density: 0,
    fog_color: [0.5, 0.5, 0.6],
    transition_speed: 1,
  };
}

function defaultDayNight(): DayNightData {
  return {
    enabled: false,
    cycle_speed: 1,
    initial_time: 0.25,
    keyframes: [
      { time: 0, ambient: [0.05, 0.05, 0.15, 1], torch_intensity: 1 },
      { time: 0.25, ambient: [0.8, 0.7, 0.5, 1], torch_intensity: 0 },
      { time: 0.5, ambient: [1, 1, 0.95, 1], torch_intensity: 0 },
      { time: 0.75, ambient: [0.8, 0.4, 0.3, 1], torch_intensity: 0.3 },
    ],
  };
}

function defaultGaussianSplat(): GaussianSplatConfig {
  return {
    camera: { position: [0, 5, 10], target: [0, 0, 0], fov: 45 },
    render_width: 320,
    render_height: 240,
    scale_multiplier: 1,
    background_image: '',
    parallax: {
      azimuth_range: 15,
      elevation_min: -5,
      elevation_max: 5,
      distance_range: 2,
      parallax_strength: 1,
    },
  };
}

function defaultPlayer(): PlayerData {
  return {
    position: [0, 0, 0],
    tint: [1, 1, 1, 1],
    facing: 'down',
    character_id: '',
  };
}

function defaultState(): SceneState {
  return {
    voxels: new Map(),
    gridWidth: 128,
    gridDepth: 96,
    ambientColor: [0.25, 0.28, 0.45, 1],
    staticLights: [],
    npcs: [],
    portals: [],
    placedObjects: [],
    player: defaultPlayer(),
    backgroundLayers: [],
    torchEmitter: defaultEmitter(),
    torchPositions: [],
    footstepEmitter: defaultEmitter(),
    npcAuraEmitter: defaultEmitter(),
    weather: defaultWeather(),
    dayNight: defaultDayNight(),
    gaussianSplat: defaultGaussianSplat(),
    collisionGridData: null,
    navZoneNames: [],
  };
}

// ── Test harness ──

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
    console.error(`    expected: ${JSON.stringify(expected).slice(0, 200)}`);
    console.error(`    actual:   ${JSON.stringify(actual).slice(0, 200)}`);
  }
}

// ============================================================
// 1. Collision Grid Operations
// ============================================================
console.log('\n=== Collision Grid Operations ===');

{
  const grid = initCollisionGrid(10, 8, 16);
  assertEqual(grid.solid.length, 80, 'Init grid: solid array length = width * height');
  assertEqual(grid.elevation.length, 80, 'Init grid: elevation array length = width * height');
  assertEqual(grid.nav_zone.length, 80, 'Init grid: nav_zone array length = width * height');
}

{
  const grid = initCollisionGrid(4, 4, 16);
  const toggled = toggleCellSolid(grid, 2, 1);
  const idx = 1 * 4 + 2; // z * width + x
  assertEqual(toggled.solid[idx], true, 'Toggle cell solid: cell becomes true');
  const toggledBack = toggleCellSolid(toggled, 2, 1);
  assertEqual(toggledBack.solid[idx], false, 'Toggle cell solid again: cell becomes false');
}

{
  const grid = initCollisionGrid(4, 4, 16);
  const updated = setCellElevation(grid, 1, 2, 5.5);
  const idx = 2 * 4 + 1;
  assertEqual(updated.elevation[idx], 5.5, 'Set cell elevation: value stored');
}

{
  const grid = initCollisionGrid(4, 4, 16);
  const updated = setCellNavZone(grid, 3, 0, 2);
  const idx = 0 * 4 + 3;
  assertEqual(updated.nav_zone[idx], 2, 'Set cell nav zone: value stored');
}

{
  // Out-of-bounds toggle should not crash and return original grid
  const grid = initCollisionGrid(4, 4, 16);
  const result = toggleCellSolid(grid, 10, 10);
  assertEqual(result.solid.length, 16, 'Toggle out-of-bounds cell: no crash, array intact');
}

{
  const grid = initCollisionGrid(5, 3, 8);
  const allWalkable = grid.solid.every((v) => v === false);
  assert(allWalkable, 'Init grid: all cells default walkable (solid=false)');
}

{
  const grid = initCollisionGrid(5, 3, 8);
  const allZero = grid.elevation.every((v) => v === 0);
  assert(allZero, 'Init grid: all elevations default 0');
}

{
  const grid = initCollisionGrid(5, 3, 8);
  const allZero = grid.nav_zone.every((v) => v === 0);
  assert(allZero, 'Init grid: all nav zones default 0');
}

// ============================================================
// 2. Scene Export Format
// ============================================================
console.log('\n=== Scene Export Format ===');

{
  const state = defaultState();
  state.collisionGridData = null;
  const json = exportSceneJson(state);
  assert(!('collision' in json), 'Export with no collision grid: no collision key');
}

{
  const state = defaultState();
  state.collisionGridData = initCollisionGrid(8, 6, 16);
  const json = exportSceneJson(state);
  assert('collision' in json, 'Export with collision grid: collision key present');
  const col = json.collision as Record<string, unknown>;
  assertEqual(col.width, 8, 'Export collision: width matches');
  assertEqual(col.height, 6, 'Export collision: height matches');
  assertEqual(col.cell_size, 16, 'Export collision: cell_size matches');
  assert(Array.isArray(col.solid), 'Export collision: solid is array');
}

{
  const state = defaultState();
  const grid = initCollisionGrid(4, 4, 16);
  grid.elevation[5] = 3.0;
  state.collisionGridData = grid;
  const json = exportSceneJson(state);
  const col = json.collision as Record<string, unknown>;
  const elev = col.elevation as number[];
  assertEqual(elev[5], 3.0, 'Export with elevation: elevation array present and correct');
}

{
  const state = defaultState();
  const grid = initCollisionGrid(4, 4, 16);
  grid.nav_zone[7] = 3;
  state.collisionGridData = grid;
  const json = exportSceneJson(state);
  const col = json.collision as Record<string, unknown>;
  const nz = col.nav_zone as number[];
  assertEqual(nz[7], 3, 'Export with nav_zone: nav_zone array present and correct');
}

{
  const state = defaultState();
  state.placedObjects = [
    {
      id: 'obj_1',
      ply_file: 'tree.ply',
      position: [1, 2, 3],
      rotation: [0, 90, 0],
      scale: 2.0,
      is_static: true,
      character_manifest: '',
    },
  ];
  const json = exportSceneJson(state);
  assert('placed_objects' in json, 'Export with placed objects: placed_objects key present');
  const objs = json.placed_objects as Record<string, unknown>[];
  assertEqual(objs.length, 1, 'Export placed objects: correct count');
  assertEqual(objs[0].ply_file, 'tree.ply', 'Export placed objects: ply_file correct');
  assertDeepEqual(objs[0].position, [1, 2, 3], 'Export placed objects: position correct');
}

{
  const state = defaultState();
  state.placedObjects = [];
  const json = exportSceneJson(state);
  assert(!('placed_objects' in json), 'Export with no placed objects: no placed_objects key');
}

{
  const state = defaultState();
  state.staticLights = [
    {
      id: 'light_1',
      position: [10, 20],
      radius: 5,
      height: 2,
      color: [1, 0.9, 0.7],
      intensity: 0.8,
    },
  ];
  const json = exportSceneJson(state);
  assert('static_lights' in json, 'Export with static light: static_lights key present');
  const lights = json.static_lights as Record<string, unknown>[];
  assertEqual(lights.length, 1, 'Export static lights: correct count');
  assertDeepEqual(lights[0].position, [10, 20], 'Export static light: position correct');
  assertEqual(lights[0].radius, 5, 'Export static light: radius correct');
  assertDeepEqual(lights[0].color, [1, 0.9, 0.7], 'Export static light: color correct');
  assertEqual(lights[0].intensity, 0.8, 'Export static light: intensity correct');
}

{
  const state = defaultState();
  state.npcs = [
    {
      id: 'npc_1',
      name: 'Guard',
      position: [5, 0, 3],
      tint: [1, 1, 1, 1],
      facing: 'down',
      reverse_facing: 'up',
      patrol_interval: 2,
      patrol_speed: 1,
      waypoints: [[5, 3], [10, 3]],
      waypoint_pause: 1,
      dialog: [{ speaker_key: 'guard', text_key: 'hello' }],
      light_color: [0, 0, 0, 0],
      light_radius: 0,
      aura_color_start: [0, 0, 0, 0],
      aura_color_end: [0, 0, 0, 0],
      character_id: 'guard_01',
      script_module: '',
      script_class: '',
    },
  ];
  const json = exportSceneJson(state);
  assert('npcs' in json, 'Export with NPC: npcs key present');
  const npcs = json.npcs as Record<string, unknown>[];
  assertEqual(npcs.length, 1, 'Export NPCs: correct count');
  assertEqual(npcs[0].name, 'Guard', 'Export NPC: name correct');
  assertEqual(npcs[0].character_id, 'guard_01', 'Export NPC: character_id correct');
}

{
  const state = defaultState();
  state.portals = [
    {
      id: 'portal_1',
      position: [15, 10],
      size: [2, 2],
      target_scene: 'dungeon.json',
      spawn_position: [3, 0, 5],
      spawn_facing: 'up',
    },
  ];
  const json = exportSceneJson(state);
  assert('portals' in json, 'Export with portal: portals key present');
  const portals = json.portals as Record<string, unknown>[];
  assertEqual(portals.length, 1, 'Export portals: correct count');
  assertEqual(portals[0].target_scene, 'dungeon.json', 'Export portal: target_scene correct');
  assertEqual(portals[0].spawn_facing, 'up', 'Export portal: spawn_facing correct');
}

{
  const state = defaultState();
  const json = exportSceneJson(state);
  assert('gaussian_splat' in json, 'Export gaussian_splat: key present');
  const gs = json.gaussian_splat as Record<string, unknown>;
  assertEqual(gs.ply_file, 'map.ply', 'Export gaussian_splat: ply_file is map.ply');
  assertDeepEqual(
    (gs.camera as Record<string, unknown>).position,
    [0, 5, 10],
    'Export gaussian_splat: camera position correct',
  );
  assertEqual(gs.render_width, 320, 'Export gaussian_splat: render_width correct');
  assertEqual(gs.render_height, 240, 'Export gaussian_splat: render_height correct');
  assert('parallax' in gs, 'Export gaussian_splat: parallax present');
}

// ============================================================
// 3. Nav Zone Names
// ============================================================
console.log('\n=== Nav Zone Names ===');

{
  const names: string[] = [];
  names.push('safe_zone');
  assertEqual(names.length, 1, 'Add nav zone name: array grows');
  assertEqual(names[0], 'safe_zone', 'Add nav zone name: value correct');
}

{
  const names = ['zone_a', 'zone_b', 'zone_c'];
  const idx = 1;
  const updated = names.filter((_, i) => i !== idx);
  assertEqual(updated.length, 2, 'Remove nav zone name: array shrinks');
  assertEqual(updated[0], 'zone_a', 'Remove nav zone name: remaining items correct');
  assertEqual(updated[1], 'zone_c', 'Remove nav zone name: order preserved');
}

{
  // No explicit duplicate detection in the store -- duplicates are allowed
  const names: string[] = [];
  names.push('dup');
  names.push('dup');
  assertEqual(names.length, 2, 'Duplicate nav zone names: both stored (no dedup)');
}

{
  // Nav zone names persist in save/load roundtrip
  const state = defaultState();
  state.navZoneNames = ['forest', 'swamp', 'town'];
  const saved = saveProject(state);
  assertDeepEqual(saved.nav_zone_names, ['forest', 'swamp', 'town'], 'Nav zone names: saved to file');
  const loaded = loadProject(saved);
  assertDeepEqual(loaded.navZoneNames, ['forest', 'swamp', 'town'], 'Nav zone names: roundtrip preserved');
}

{
  // Empty nav zone names → no nav_zone_names key in saved file
  const state = defaultState();
  state.navZoneNames = [];
  const saved = saveProject(state);
  assertEqual(saved.nav_zone_names, undefined, 'Empty nav zone names: no nav_zone_names key in export');
}

// ============================================================
// 4. File Roundtrip
// ============================================================
console.log('\n=== File Roundtrip ===');

{
  // Save → load → save → compare JSON identical
  const state = defaultState();
  state.collisionGridData = initCollisionGrid(4, 4, 16);
  state.navZoneNames = ['zone_a'];
  state.staticLights = [
    { id: 'l1', position: [1, 2], radius: 5, height: 2, color: [1, 0.9, 0.7], intensity: 1 },
  ];
  const saved1 = saveProject(state);
  const loaded = loadProject(saved1);
  const saved2 = saveProject(loaded);
  assertDeepEqual(saved1, saved2, 'Save-load-save roundtrip: JSON output identical');
}

{
  // Save with voxels → load → voxel count matches
  const state = defaultState();
  state.voxels.set(voxelKey(0, 0, 0), { color: [255, 0, 0, 255] });
  state.voxels.set(voxelKey(1, 0, 0), { color: [0, 255, 0, 255] });
  state.voxels.set(voxelKey(2, 3, 1), { color: [0, 0, 255, 255] });
  const saved = saveProject(state);
  const loaded = loadProject(saved);
  assertEqual(loaded.voxels.size, 3, 'Roundtrip voxels: count matches');
  const v = loaded.voxels.get(voxelKey(2, 3, 1));
  assertDeepEqual(v?.color, [0, 0, 255, 255], 'Roundtrip voxels: color preserved');
}

{
  // Save with collision grid → load → grid dimensions match
  const state = defaultState();
  state.collisionGridData = initCollisionGrid(12, 8, 32);
  state.collisionGridData = toggleCellSolid(state.collisionGridData, 3, 2);
  const saved = saveProject(state);
  const loaded = loadProject(saved);
  assertEqual(loaded.collisionGridData!.width, 12, 'Roundtrip collision grid: width matches');
  assertEqual(loaded.collisionGridData!.height, 8, 'Roundtrip collision grid: height matches');
  assertEqual(loaded.collisionGridData!.cell_size, 32, 'Roundtrip collision grid: cell_size matches');
  const idx = 2 * 12 + 3;
  assertEqual(loaded.collisionGridData!.solid[idx], true, 'Roundtrip collision grid: toggled cell preserved');
}

{
  // Save with placed objects → load → object count matches
  const state = defaultState();
  state.placedObjects = [
    { id: 'obj_1', ply_file: 'rock.ply', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, is_static: true, character_manifest: '' },
    { id: 'obj_2', ply_file: 'tree.ply', position: [5, 0, 5], rotation: [0, 45, 0], scale: 2, is_static: false, character_manifest: 'char.json' },
  ];
  const saved = saveProject(state);
  const loaded = loadProject(saved);
  assertEqual(loaded.placedObjects.length, 2, 'Roundtrip placed objects: count matches');
  assertEqual(loaded.placedObjects[1].ply_file, 'tree.ply', 'Roundtrip placed objects: data preserved');
}

{
  // Save empty project → load → all defaults restored
  const state = defaultState();
  const saved = saveProject(state);
  const loaded = loadProject(saved);
  assertEqual(loaded.voxels.size, 0, 'Roundtrip empty: no voxels');
  assertEqual(loaded.collisionGridData, null, 'Roundtrip empty: no collision grid');
  assertDeepEqual(loaded.navZoneNames, [], 'Roundtrip empty: no nav zone names');
  assertEqual(loaded.staticLights.length, 0, 'Roundtrip empty: no lights');
  assertEqual(loaded.npcs.length, 0, 'Roundtrip empty: no NPCs');
  assertEqual(loaded.portals.length, 0, 'Roundtrip empty: no portals');
  assertEqual(loaded.placedObjects.length, 0, 'Roundtrip empty: no placed objects');
  assertEqual(loaded.gridWidth, 128, 'Roundtrip empty: default gridWidth');
  assertEqual(loaded.gridDepth, 96, 'Roundtrip empty: default gridDepth');
}

// ── Summary ──
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
