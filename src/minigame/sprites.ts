import { heldLayer, Loadout as Gear } from '@/arcade/loadout';
import { buildAvatar } from '@/avatar/model';
import { AvatarLook, DEFAULT_LOOK } from '@/avatar/parts';
import { bounds, Bounds, groupByFill, Layer, meshScene, Quad, sprite, Sprite, Voxel } from '@/voxel/engine';

import type { ZombieKind } from './survivor';

/** Camera for every figure in Dead Hours: high and a little in front, like an isometric survival game. */
export const SCENE_PITCH = 38;
export const WALK_FRAMES = [0, 0.7, 0, -0.7];
const MUTED = 0.22;

const ZOMBIE_LOOKS: Record<ZombieKind, Partial<AvatarLook>> = {
  walker: {
    skin: '#8A9A78',
    hair: 'short',
    hairColor: '#3B2418',
    eyeColor: '#C8B84A',
    brows: 'angry',
    mouth: 'open',
    beard: 'stubble',
    top: 'tee',
    topColor: '#6E6253',
  },
  runner: {
    skin: '#97A483',
    hair: 'bob',
    hairColor: '#6E3B1F',
    eyeColor: '#D04A3A',
    brows: 'angry',
    mouth: 'open',
    beard: 'none',
    top: 'hoodie',
    topColor: '#4A5466',
  },
  brute: {
    skin: '#76896A',
    hair: 'buzz',
    hairColor: '#1C1A1A',
    eyeColor: '#C8B84A',
    brows: 'thick',
    mouth: 'grin',
    beard: 'full',
    top: 'collar',
    topColor: '#5A4A3A',
  },
  boss: {
    skin: '#6E7E60',
    hair: 'bald',
    hairColor: '#1C1A1A',
    eyeColor: '#FF3B3B',
    brows: 'angry',
    mouth: 'grin',
    beard: 'none',
    top: 'tee',
    topColor: '#D9D4C6',
  },
};

/** World units per voxel, so a walker stands about as tall as its hit circle suggests. */
export const ZOMBIE_UNIT: Record<ZombieKind, number> = { walker: 0.82, runner: 0.74, brute: 1.15, boss: 1.9 };
// (units are per full-size voxel; zombie meshes are half resolution with a 2x layer scale)
export const PLAYER_UNIT = 0.85;

function noise(x: number, y: number, z: number): number {
  let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (z * 83492791), 2654435761);
  h ^= h >>> 15;
  return ((h >>> 0) % 1000) / 1000;
}

/** Dried and fresh blood over the clothes; the boss is soaked. */
function bloodied(voxels: Voxel[], skin: string, amount: number): Voxel[] {
  return voxels.map(([x, y, z, c]) => {
    if (c === skin || y < 6 || y > 49) return [x, y, z, c];
    const n = noise(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2));
    return n < amount ? [x, y, z, n < amount / 2 ? '#4A1010' : '#7A1E1E'] : [x, y, z, c];
  });
}

/** Halves the voxel resolution (each 2x2x2 block takes its most common colour): a quarter of the polygons. */
export function downsample(voxels: Voxel[]): Voxel[] {
  const cells = new Map<string, Map<string, number>>();
  for (const [x, y, z, c] of voxels) {
    const k = `${Math.floor(x / 2)},${Math.floor(y / 2)},${Math.floor(z / 2)}`;
    const tally = cells.get(k) ?? new Map<string, number>();
    tally.set(c, (tally.get(c) ?? 0) + 1);
    cells.set(k, tally);
  }
  return [...cells].flatMap(([k, tally]) => {
    let best = '';
    let n = 0;
    for (const [c, count] of tally) if (count > n) [best, n] = [c, count];
    // drop lonely corners so the silhouette stays clean
    if (n + [...tally.values()].reduce((a, b) => a + b, 0) - n < 2) return [];
    const [x, y, z] = k.split(',').map(Number);
    return [[x, y, z, best] as Voxel];
  });
}

interface Meshed {
  quads: Quad[];
  b: Bounds;
}
const meshes = new Map<string, Meshed>();
const sprites = new Map<string, Sprite>();

function meshed(key: string, layers: () => Layer[]): Meshed {
  let m = meshes.get(key);
  if (!m) {
    const quads = meshScene(layers());
    m = { quads, b: bounds(quads) };
    meshes.set(key, m);
  }
  return m;
}

function projected(key: string, m: Meshed, yaw: number, unit: number, cheap = false): Sprite {
  let s = sprites.get(key);
  if (!s) {
    s = sprite(m.quads, m.b, yaw, SCENE_PITCH, unit, MUTED);
    if (cheap) s = { ...s, polys: groupByFill(s.polys) };
    sprites.set(key, s);
  }
  return s;
}

/** Snaps a facing angle (radians, screen space) to one of eight turns. Screen down is towards the camera. */
export function yawFor(angle: number): number {
  return (((Math.round((90 - (angle * 180) / Math.PI) / 45) * 45) % 360) + 360) % 360;
}

export function zombieSprite(kind: ZombieKind, yaw: number, frame: number): Sprite {
  const m = meshed(`z|${kind}|${frame}`, () => {
    const look = { ...DEFAULT_LOOK, hat: 'none', glasses: 'none', outfit: 'none', ...ZOMBIE_LOOKS[kind] } as AvatarLook;
    const voxels = buildAvatar(look, { reach: true, walk: frame ? 0.45 : -0.45 });
    return [{ voxels: downsample(bloodied(voxels, look.skin, kind === 'boss' ? 0.32 : 0.12)), scale: 2 }];
  });
  return projected(`z|${kind}|${frame}|${yaw}`, m, yaw, ZOMBIE_UNIT[kind], true);
}

/** The player's figure: their look, the aim pose, and the equipped weapon in hand. */
export function playerSprite(look: AvatarLook, gear: Gear, yaw: number, frame: number): Sprite {
  const id = `${JSON.stringify(look)}|${gear.item.id}|${gear.seed}`;
  const m = meshed(`p|${id}|${frame}`, () => [{ voxels: buildAvatar(look, { aim: true, walk: WALK_FRAMES[frame] }) }, heldLayer(gear, true)]);
  return projected(`p|${id}|${frame}|${yaw}`, m, yaw, PLAYER_UNIT);
}

/** Drops cached player sprites when the look or weapon changes (zombie ones are kept). */
export function forgetPlayerSprites() {
  for (const k of [...meshes.keys()]) if (k.startsWith('p|')) meshes.delete(k);
  for (const k of [...sprites.keys()]) if (k.startsWith('p|')) sprites.delete(k);
}
