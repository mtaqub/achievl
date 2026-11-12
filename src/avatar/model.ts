import type { Voxel } from '@/voxel/engine';

import { AvatarLook, partOf } from './parts';

/**
 * Builds the 3D voxel figure for a look. Units are voxels; x runs left to right,
 * y up from the boot soles, z towards the viewer. The figure faces +z.
 *
 * Layout: legs y 0-11, torso y 12-23, neck y 24, head y 25-35 (10 x 11 x 9).
 * Rows on the face count up from the chin: eyes 5-6, brows 8, nose 3-4, mouth 1-2.
 */

const INK = '#1F1A17';

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}
const shade = (hex: string, amount: number) => (amount >= 0 ? mix(hex, '#FFFFFF', amount) : mix(hex, '#000000', -amount));

/** Deterministic noise per voxel, for camo and ghillie. */
function noise(x: number, y: number, z: number): number {
  let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (z * 83492791), 2654435761);
  h ^= h >>> 15;
  return ((h >>> 0) % 1000) / 1000;
}

class Builder {
  m = new Map<string, string>();
  set(x: number, y: number, z: number, c: string) {
    this.m.set(`${x},${y},${z}`, c);
  }
  has(x: number, y: number, z: number) {
    return this.m.has(`${x},${y},${z}`);
  }
  /** Recolours a voxel only if it exists. */
  paint(x: number, y: number, z: number, c: string) {
    if (this.has(x, y, z)) this.set(x, y, z, c);
  }
  del(x: number, y: number, z: number) {
    this.m.delete(`${x},${y},${z}`);
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string | ((x: number, y: number, z: number) => string)) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, typeof c === 'string' ? c : c(x, y, z));
  }
  /** Recolours every existing voxel in a box. */
  paintBox(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string | ((x: number, y: number, z: number) => string)) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.paint(x, y, z, typeof c === 'string' ? c : c(x, y, z));
  }
  /** Ring of voxels round a rectangle at one height. */
  ring(x0: number, z0: number, x1: number, z1: number, y: number, c: string) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, c);
  }
  voxels(): Voxel[] {
    return [...this.m].map(([k, c]) => {
      const [x, y, z] = k.split(',').map(Number);
      return [x, y, z, c];
    });
  }
}

interface Head {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

function headFor(face: string): Head {
  switch (face) {
    case 'oval':
      return { x0: 6, x1: 13, y0: 50, y1: 60, z0: 2, z1: 8 };
    case 'long':
      return { x0: 6, x1: 13, y0: 50, y1: 61, z0: 1, z1: 8 };
    default:
      return { x0: 6, x1: 13, y0: 50, y1: 60, z0: 1, z1: 8 };
  }
}

const COVERING_HATS = ['tophat', 'horns', 'wizard', 'beanie', 'cap', 'helmet', 'boonie', 'nvg', 'racehelm', 'tricorn', 'balaclava'];
const TACTICAL_TOPS = ['vest', 'plate', 'camo', 'ghillie', 'gi'];

/** How the figure stands: a walk swing from -1 to 1, and which arms reach forward. */
export interface Pose {
  walk?: number;
  /** Both arms straight out in front (zombies). */
  reach?: boolean;
  /** Right arm forward, as if aiming what it holds. */
  aim?: boolean;
}

/** Looks up a colour slot, also accepting a raw hex colour (zombies use skins outside the palette). */
function colourOf(slot: 'skin' | 'hairColor' | 'eyeColor' | 'topColor', value: string): string {
  if (value.startsWith('#') && !partOf(slot, value).color?.startsWith(value)) return value;
  return partOf(slot, value).color ?? value;
}

export function buildAvatar(look: AvatarLook, pose: Pose = {}): Voxel[] {
  const b = new Builder();
  const skin = colourOf('skin', look.skin);
  const hair = colourOf('hairColor', look.hairColor);
  const eyeColour = colourOf('eyeColor', look.eyeColor);
  const colour = colourOf('topColor', look.topColor);
  const h = headFor(look.face);
  const fz = h.z1; // the face plane
  const row = (r: number) => h.y0 + r;
  const lip = shade(skin, -0.32);

  /* ---------------------------------------------------------------- body */
  const top = look.top;
  const shirt =
    top === 'tux' || top === 'gi'
      ? '#1C1D22'
      : top === 'armor'
        ? '#9AA3AD'
        : top === 'space'
          ? '#E6E8EB'
          : top === 'ghillie'
            ? '#4E5B33'
            : top === 'bomber'
              ? '#EFE6D2'
              : top === 'sailor'
                ? '#F4F4F2'
                : colour;
  const pants =
    top === 'robe'
      ? colour
      : top === 'tux' || top === 'gi'
        ? '#1C1D22'
        : top === 'space'
          ? '#E6E8EB'
          : top === 'armor'
            ? '#7E8790'
            : TACTICAL_TOPS.includes(top)
              ? '#4A4E44'
              : '#3A3D42';
  const camo = (base: string) => (x: number, y: number, z: number) => {
    const n = noise(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2));
    return n < 0.3 ? shade(base, -0.28) : n < 0.55 ? shade(base, 0.14) : base;
  };
  const ghillie = (x: number, y: number, z: number) => ['#4E5B33', '#6E7A45', '#3A4426', '#7D7A48'][Math.floor(noise(x, y, z) * 4)];
  const fabric = (base: string): ((x: number, y: number, z: number) => string) => (top === 'camo' ? camo(base) : top === 'ghillie' ? ghillie : () => base);

  // legs and boots
  b.box(5, 0, 3, 9, 11, 7, fabric(pants));
  b.box(10, 0, 3, 14, 11, 7, fabric(pants));
  b.paintBox(5, 0, 3, 14, 2, 7, '#2B2621');
  b.box(5, 0, 8, 9, 1, 8, '#2B2621');
  b.box(10, 0, 8, 14, 1, 8, '#2B2621');
  b.paintBox(5, 11, 3, 14, 11, 7, top === 'robe' ? '#C9A227' : '#2A2620'); // belt
  const skirt = top === 'bomber' || top === 'sailor';
  if (skirt) {
    const pleat = top === 'sailor' ? '#2A3A6E' : colour;
    b.paintBox(5, 3, 3, 14, 7, 7, skin); // legs
    b.paintBox(5, 3, 3, 14, 5, 7, top === 'bomber' ? '#F7F7F7' : '#1E1E24'); // knee socks
    b.box(4, 7, 2, 15, 11, 8, (x) => ((x + 1) % 3 === 0 ? shade(pleat, -0.18) : pleat));
  }
  // torso
  b.box(4, 12, 3, 15, 23, 8, fabric(shirt));
  // arms and hands
  const gloves = TACTICAL_TOPS.includes(top) || top === 'armor' || top === 'space' ? (top === 'space' ? '#C3CAD3' : '#2A2C30') : skin;
  const sleeve = top === 'tee' || top === 'jersey' ? 19 : 12;
  for (const x0 of [1, 16]) {
    b.box(x0, 12, 4, x0 + 2, 23, 7, (x, y, z) => (y >= sleeve ? fabric(shirt)(x, y, z) : skin));
    b.box(x0, 9, 4, x0 + 2, 11, 7, gloves);
  }
  if (top === 'varsity') for (const x0 of [1, 16]) b.paintBox(x0, 12, 4, x0 + 2, 23, 7, '#F2EEE2');
  // neck
  b.box(8, 24, 4, 11, 24, 7, skin);

  // top details on the chest (z 8 is the chest plane, 9 sticks out)
  switch (top) {
    case 'tee':
      b.paintBox(8, 22, 8, 11, 23, 8, skin);
      break;
    case 'hoodie':
      b.box(5, 22, 2, 14, 24, 3, shade(colour, -0.12)); // hood
      b.paintBox(6, 13, 8, 13, 16, 8, shade(colour, -0.14)); // pocket
      b.paintBox(8, 17, 8, 8, 21, 8, '#F2F2F2');
      b.paintBox(11, 17, 8, 11, 21, 8, '#F2F2F2');
      break;
    case 'collar':
      b.paintBox(6, 22, 8, 8, 23, 8, '#F7F7F7');
      b.paintBox(11, 22, 8, 13, 23, 8, '#F7F7F7');
      for (let y = 13; y <= 21; y += 3) b.paint(9, y, 8, shade(colour, -0.3));
      break;
    case 'jersey':
      b.paintBox(4, 16, 3, 15, 17, 8, '#FFFFFF');
      b.paintBox(8, 19, 8, 11, 21, 8, shade(colour, 0.35));
      break;
    case 'varsity':
      b.paintBox(5, 18, 8, 7, 21, 8, '#F2EEE2');
      b.paintBox(9, 12, 8, 10, 23, 8, shade(colour, -0.2));
      break;
    case 'tux':
      b.paintBox(8, 12, 8, 11, 23, 8, '#F7F7F7');
      b.paintBox(8, 22, 9, 11, 22, 9, colour);
      b.box(8, 22, 9, 11, 22, 9, colour);
      b.paint(9, 18, 8, '#1C1D22');
      b.paint(9, 15, 8, '#1C1D22');
      break;
    case 'vest':
      b.box(5, 13, 9, 14, 22, 9, (x, y) => (y === 22 ? shade(colour, -0.1) : shade(colour, -0.18)));
      b.box(5, 13, 2, 14, 22, 2, shade(colour, -0.18));
      for (const x0 of [5, 8, 11]) b.box(x0 + 1, 14, 10, x0 + 2, 16, 10, shade(colour, -0.3));
      b.box(6, 18, 10, 7, 19, 10, '#1E1F22'); // radio
      break;
    case 'plate':
      b.box(5, 13, 9, 14, 22, 9, '#2F3329');
      b.box(5, 13, 2, 14, 22, 2, '#2F3329');
      for (const x0 of [5, 8, 11]) b.box(x0 + 1, 14, 10, x0 + 2, 17, 10, '#3E4433');
      b.box(10, 19, 10, 13, 21, 10, '#5C6650'); // patch
      b.box(4, 22, 3, 6, 23, 8, '#23261F');
      b.box(13, 22, 3, 15, 23, 8, '#23261F');
      break;
    case 'camo':
      b.paintBox(8, 22, 8, 11, 23, 8, '#2A2C30');
      break;
    case 'gi':
      for (let i = 0; i < 6; i++) {
        b.paint(8 + Math.floor(i / 2), 23 - i, 8, '#3A3C42');
        b.paint(11 - Math.floor(i / 2), 23 - i, 8, '#3A3C42');
      }
      b.paintBox(4, 14, 3, 15, 15, 8, colour);
      break;
    case 'ghillie':
      for (const [k] of [...b.m]) {
        const [x, y, z] = k.split(',').map(Number);
        if (y < 3 || y > 23 || noise(x, y, z + 9) > 0.12) continue;
        const dx = x <= 4 ? -1 : x >= 15 ? 1 : 0;
        if (!b.has(x + dx, y, z + (dx === 0 ? 1 : 0))) b.set(x + dx, y, z + (dx === 0 ? 1 : 0), ghillie(x, y, z + 1));
      }
      break;
    case 'bomber':
      b.paintBox(9, 12, 8, 10, 23, 8, shade('#EFE6D2', -0.15)); // zip
      b.paintBox(4, 12, 3, 15, 12, 8, shade('#EFE6D2', -0.2)); // waistband
      for (const [x, y, c] of [
        [6, 19, '#FF5CA8'],
        [7, 19, '#FF5CA8'],
        [12, 16, '#5CE0B0'],
        [13, 21, '#FFD23F'],
        [6, 14, '#7C5CFF'],
      ] as [number, number, string][])
        b.paint(x, y, 8, c);
      b.paint(17, 20, 7, '#FF5CA8');
      break;
    case 'sailor':
      b.paintBox(4, 20, 3, 15, 23, 3, '#2A3A6E'); // collar at the back
      b.paintBox(5, 21, 8, 7, 23, 8, '#2A3A6E');
      b.paintBox(12, 21, 8, 14, 23, 8, '#2A3A6E');
      b.box(8, 19, 9, 11, 20, 9, '#D9483B'); // bow
      b.paintBox(1, 12, 4, 3, 13, 7, '#2A3A6E');
      b.paintBox(16, 12, 4, 18, 13, 7, '#2A3A6E');
      break;
    case 'robe':
      b.paintBox(9, 0, 8, 10, 23, 8, '#C9A227');
      b.paintBox(5, 0, 3, 14, 1, 8, '#C9A227');
      b.paintBox(4, 14, 3, 15, 14, 8, '#C9A227');
      break;
    case 'armor':
      b.box(0, 21, 3, 4, 24, 8, '#C3CAD3');
      b.box(15, 21, 3, 19, 24, 8, '#C3CAD3');
      b.paintBox(8, 16, 8, 11, 19, 8, colour);
      b.paintBox(4, 12, 3, 15, 12, 8, '#6B737C');
      break;
    case 'space':
      b.box(7, 15, 9, 12, 19, 9, colour);
      b.set(8, 17, 10, '#FFFFFF');
      b.set(11, 17, 10, '#FFE04B');
      b.box(5, 13, 1, 14, 22, 2, '#C3CAD3'); // pack
      break;
  }

  // Stretch the body to adult proportions (about seven heads tall): legs 0-25, torso 26-47, neck 48-49.
  {
    const body = [...b.m].map(([k, c]) => [...k.split(',').map(Number), c] as [number, number, number, string]).filter(([, y]) => y <= 24);
    const src = (y: number) => (y < 26 ? Math.floor((y * 12) / 26) : y < 48 ? 12 + Math.floor(((y - 26) * 12) / 22) : 24);
    const bySource = new Map<number, [number, number, number, string][]>();
    for (const v of body) {
      b.del(v[0], v[1], v[2]);
      const list = bySource.get(v[1]) ?? [];
      list.push(v);
      bySource.set(v[1], list);
    }
    for (let y = 0; y < 50; y++) for (const [x, , z, c] of bySource.get(src(y)) ?? []) b.set(x, y, z, c);
    // a gap between the legs, and slimmer shins
    const gapTop = look.top === 'bomber' || look.top === 'sailor' ? 14 : 22;
    if (look.top !== 'robe' && look.top !== 'ghillie') for (let y = 2; y < gapTop; y++) for (let z = 0; z < 10; z++) for (const x of [9, 10]) b.del(x, y, z);
  }

  /* ---------------------------------------------------------------- head */
  b.box(h.x0, h.y0, h.z0, h.x1, h.y1, h.z1, skin);
  if (look.face !== 'square') {
    // bevel the four vertical edges
    for (let y = h.y0; y <= h.y1; y++) for (const x of [h.x0, h.x1]) for (const z of [h.z0, h.z1]) b.del(x, y, z);
  }
  if (look.face === 'heart') {
    for (const x of [h.x0, h.x0 + 1, h.x1 - 1, h.x1]) for (let z = h.z0; z <= h.z1; z++) b.del(x, h.y0, z);
  }
  // ears
  b.box(h.x0 - 1, row(4), 4, h.x0 - 1, row(6), 5, shade(skin, -0.05));
  b.box(h.x1 + 1, row(4), 4, h.x1 + 1, row(6), 5, shade(skin, -0.05));

  // facial hair first, so the mouth and nose draw over it
  switch (look.beard) {
    case 'stubble':
      b.paintBox(h.x0, row(0), h.z0 + 3, h.x1, row(3), fz, mix(skin, hair, 0.35));
      break;
    case 'moustache':
      b.paintBox(7, row(2), fz, 12, row(2), fz, hair);
      break;
    case 'goatee':
      b.paintBox(8, row(0), fz, 11, row(1), fz, hair);
      break;
    case 'full':
      b.paintBox(h.x0, row(0), h.z0 + 2, h.x1, row(4), fz, hair);
      b.paintBox(h.x0, row(5), h.z0 + 2, h.x0, row(7), fz, hair);
      b.paintBox(h.x1, row(5), h.z0 + 2, h.x1, row(7), fz, hair);
      b.box(7, row(0), fz + 1, 12, row(1), fz + 1, hair);
      break;
  }

  // nose
  const noseDark = shade(skin, -0.18);
  switch (look.nose) {
    case 'long':
      b.box(9, row(3), fz + 1, 10, row(5), fz + 1, skin);
      b.paintBox(9, row(3), fz + 1, 10, row(3), fz + 1, noseDark);
      break;
    case 'wide':
      b.box(8, row(3), fz + 1, 11, row(4), fz + 1, skin);
      b.paint(8, row(3), fz + 1, noseDark);
      b.paint(11, row(3), fz + 1, noseDark);
      break;
    case 'dot':
      b.paintBox(9, row(3), fz, 10, row(3), fz, noseDark);
      break;
    default:
      b.box(9, row(3), fz + 1, 10, row(4), fz + 1, skin);
      b.paintBox(9, row(3), fz + 1, 10, row(3), fz + 1, noseDark);
  }

  // mouth
  const m = (x0: number, x1: number, r: number, c: string) => b.paintBox(x0, row(r), fz, x1, row(r), fz, c);
  switch (look.mouth) {
    case 'smile':
      m(8, 11, 1, lip);
      m(7, 7, 2, lip);
      m(12, 12, 2, lip);
      break;
    case 'grin':
      m(7, 12, 1, '#F4F1EA');
      m(7, 12, 2, lip);
      break;
    case 'open':
      m(9, 10, 1, '#5A1E1E');
      m(9, 10, 0, '#5A1E1E');
      break;
    case 'smirk':
      m(8, 10, 1, lip);
      m(11, 11, 2, lip);
      break;
    case 'tongue':
      m(8, 11, 1, lip);
      m(9, 10, 0, '#E86A7A');
      break;
    default:
      m(8, 11, 1, lip);
  }

  // eyes: outer white, inner iris; [outer x, inner x] per eye
  const eyes: [number, number][] = [
    [7, 8],
    [12, 11],
  ];
  const lid = shade(skin, -0.16);
  eyes.forEach(([outer, inner], i) => {
    const kind = look.eyes === 'wink' && i === 1 ? 'shut' : look.eyes;
    const p = (x: number, r: number, c: string) => b.paint(x, row(r), fz, c);
    switch (kind) {
      case 'dot':
        p(inner, 5, INK);
        break;
      case 'happy':
      case 'shut':
        p(outer, 5, INK);
        p(inner, 5, INK);
        break;
      case 'sleepy':
        p(outer, 5, '#F4F1EA');
        p(inner, 5, eyeColour);
        p(outer, 6, shade(skin, -0.28));
        p(inner, 6, shade(skin, -0.28));
        break;
      case 'sharp':
        p(outer, 5, '#F4F1EA');
        p(inner, 5, eyeColour);
        p(inner, 6, INK);
        break;
      default:
        p(outer, 5, '#F4F1EA');
        p(inner, 5, eyeColour);
        p(outer, 6, lid);
        p(inner, 6, lid);
    }
  });

  // brows
  const brow = (x: number, r: number) => b.paint(x, row(r), fz, hair);
  switch (look.brows) {
    case 'arched':
      [7, 8, 11, 12].forEach((x) => brow(x, 8));
      brow(6, 7);
      brow(13, 7);
      break;
    case 'thick':
      [6, 7, 8, 11, 12, 13].forEach((x) => {
        brow(x, 8);
        brow(x, 7);
      });
      break;
    case 'angry':
      brow(8, 7);
      brow(11, 7);
      [6, 7, 12, 13].forEach((x) => brow(x, 8));
      break;
    case 'none':
      break;
    default:
      [6, 7, 8, 11, 12, 13].forEach((x) => brow(x, 7));
  }

  /* ---------------------------------------------------------------- hair */
  const covered = COVERING_HATS.includes(look.hat);
  // anime eyes are three rows tall with lashes and a little blush
  if (look.eyes === 'anime') {
    for (const [outer, inner] of eyes) {
      b.paint(outer, row(6), fz, INK);
      b.paint(inner, row(6), fz, INK);
      b.paint(outer, row(5), fz, '#FFFFFF');
      b.paint(outer, row(4), fz, '#F4F1EA');
      b.paint(inner, row(5), fz, shade(eyeColour, 0.25));
      b.paint(inner, row(4), fz, eyeColour);
    }
    b.paint(6, row(3), fz, '#F49AA8');
    b.paint(13, row(3), fz, '#F49AA8');
  }
  const hairBand = (r0: number, r1: number) => b.paintBox(h.x0, row(r0), h.z0, h.x1, row(r1), h.z1, hair);
  const backOfHead = (r0: number) => b.paintBox(h.x0, row(r0), h.z0, h.x1, h.y1, h.z0 + 2, hair);
  const cap = () => b.box(h.x0, h.y1 + 1, h.z0, h.x1, h.y1 + 1, h.z1 - 1, hair);
  if (!covered || look.hair === 'long') {
    switch (look.hair) {
      case 'buzz':
        b.paintBox(h.x0, h.y1, h.z0, h.x1, h.y1, h.z1, shade(hair, 0.08));
        b.paintBox(h.x0, row(9), h.z0, h.x1, row(9), h.z1 - 1, shade(hair, 0.08));
        break;
      case 'short':
        if (!covered) {
          hairBand(9, 10);
          backOfHead(4);
          cap();
        }
        break;
      case 'swoop':
        hairBand(9, 10);
        backOfHead(4);
        cap();
        b.paintBox(h.x0, row(8), fz, 9, row(8), fz, hair);
        b.box(h.x0, h.y1 + 2, 4, 9, h.y1 + 2, h.z1 - 1, hair);
        break;
      case 'spiky':
        hairBand(9, 10);
        backOfHead(4);
        cap();
        for (const [x, z] of [
          [6, 3],
          [9, 6],
          [12, 3],
          [7, 7],
          [12, 7],
        ])
          b.box(x, h.y1 + 2, z, x + 1, h.y1 + 3, z + 1, hair);
        break;
      case 'bob':
      case 'long':
        if (!covered) {
          hairBand(9, 10);
          cap();
          b.box(h.x0 - 1, row(2), h.z0, h.x0 - 1, h.y1, h.z1 - 3, hair);
          b.box(h.x1 + 1, row(2), h.z0, h.x1 + 1, h.y1, h.z1 - 3, hair);
        }
        b.box(h.x0, row(look.hair === 'long' ? -8 : 2), h.z0 - 1, h.x1, h.y1, h.z0 - 1, hair);
        break;
      case 'bun':
        hairBand(9, 10);
        backOfHead(4);
        cap();
        b.box(8, h.y1 - 1, h.z0 - 2, 11, h.y1 + 2, h.z0 - 1, hair);
        break;
      case 'curly':
        hairBand(9, 10);
        backOfHead(3);
        cap();
        for (let x = h.x0 - 1; x <= h.x1 + 1; x++) for (let z = h.z0 - 1; z <= h.z1; z++) if ((x + z) % 2 === 0) b.set(x, h.y1 + 2, z, shade(hair, 0.06));
        b.box(h.x0 - 1, row(6), h.z0, h.x0 - 1, h.y1, h.z1 - 3, hair);
        b.box(h.x1 + 1, row(6), h.z0, h.x1 + 1, h.y1, h.z1 - 3, hair);
        break;
      case 'twintails':
        hairBand(9, 10);
        backOfHead(3);
        cap();
        for (const x of [6, 8, 9, 11, 13]) b.paint(x, row(8), fz, hair); // choppy bangs
        // tails hang behind the shoulders so they never cut through the arms
        for (const x0 of [h.x0 - 3, h.x1 + 1]) {
          b.box(x0, row(-8), 0, x0 + 2, row(9), 2, hair);
          b.box(x0, row(7), 0, x0 + 2, row(8), 2, '#FF5CA8'); // hair ties
        }
        break;
      case 'hime':
        hairBand(9, 10);
        cap();
        b.paintBox(h.x0, row(8), fz, h.x1, row(8), fz, hair); // straight bangs
        b.paintBox(h.x0, row(1), h.z0, h.x0, row(10), h.z1, hair); // side locks
        b.paintBox(h.x1, row(1), h.z0, h.x1, row(10), h.z1, hair);
        b.box(h.x0, row(-9), h.z0 - 1, h.x1, h.y1, h.z0 - 1, hair);
        break;
      case 'mohawk':
        b.paintBox(h.x0, h.y1, h.z0, h.x1, h.y1, h.z1, shade(skin, -0.1));
        b.box(9, h.y1 + 1, h.z0, 10, h.y1 + 3, h.z1 - 1, hair);
        break;
    }
  }

  /* ---------------------------------------------------------------- glasses */
  const gz = fz + 1;
  const temples = (c: string) => {
    b.paintBox(h.x0, row(6), h.z0 + 3, h.x0, row(6), fz, c);
    b.paintBox(h.x1, row(6), h.z0 + 3, h.x1, row(6), fz, c);
  };
  switch (look.glasses) {
    case 'round':
    case 'square': {
      const c = look.glasses === 'round' ? '#5A3A22' : '#1E1E24';
      b.box(6, row(7), gz, 13, row(7), gz, c);
      for (const x of [6, 9, 10, 13]) b.box(x, row(5), gz, x, row(6), gz, c);
      b.box(6, row(4), gz, 9, row(4), gz, c);
      b.box(10, row(4), gz, 13, row(4), gz, c);
      temples(c);
      break;
    }
    case 'ballistic':
      b.box(6, row(5), gz, 13, row(6), gz, '#22272E');
      b.set(7, row(6), gz, '#3A4450');
      temples('#22272E');
      break;
    case 'shades':
      b.box(6, row(5), gz, 8, row(6), gz, '#111114');
      b.box(11, row(5), gz, 13, row(6), gz, '#111114');
      b.box(9, row(6), gz, 10, row(6), gz, '#111114');
      temples('#111114');
      break;
    case 'goggles':
      b.paintBox(h.x0, row(6), h.z0, h.x1, row(6), h.z1, '#2A2C30');
      b.box(6, row(5), gz, 8, row(7), gz, '#E0A030');
      b.box(11, row(5), gz, 13, row(7), gz, '#E0A030');
      b.box(9, row(6), gz, 10, row(6), gz, '#2A2C30');
      b.set(7, row(7), gz, '#FFF2C8');
      b.set(12, row(7), gz, '#FFF2C8');
      break;
    case 'eyepatch':
      b.box(7, row(5), gz, 8, row(6), gz, '#111114');
      b.paintBox(9, row(7), fz, h.x1, row(7), fz, '#111114');
      b.paintBox(h.x1, row(7), h.z0, h.x1, row(8), fz, '#111114');
      break;
    case 'monocle':
      b.ring(10, gz, 13, gz, row(4), '#C9A227');
      for (const x of [10, 13]) b.box(x, row(5), gz, x, row(6), gz, '#C9A227');
      b.box(10, row(7), gz, 13, row(7), gz, '#C9A227');
      break;
    case 'visor':
      b.box(h.x0, row(5), gz, h.x1, row(7), gz, '#22E0FF');
      break;
    case 'starry':
      b.box(6, row(5), gz, 8, row(6), gz, '#FF5CA8');
      b.box(11, row(5), gz, 13, row(6), gz, '#FF5CA8');
      b.set(7, row(5), gz, '#FFE04B');
      b.set(12, row(5), gz, '#FFE04B');
      break;
    case 'retro3d':
      b.box(6, row(5), gz, 8, row(6), gz, '#FF3B3B');
      b.box(11, row(5), gz, 13, row(6), gz, '#2BB7FF');
      b.box(6, row(7), gz, 13, row(7), gz, '#F2F2F2');
      break;
  }

  /* ---------------------------------------------------------------- hats */
  const X0 = h.x0;
  const X1 = h.x1;
  const T = h.y1;
  switch (look.hat) {
    case 'helmet':
    case 'nvg': {
      const shell = look.hat === 'nvg' ? '#3A3D42' : '#4F5640';
      b.box(X0 - 1, row(8), h.z0 - 1, X1 + 1, T + 2, h.z1 + 1, shell);
      for (let x = X0; x <= X1; x++) for (let z = h.z0; z <= h.z1; z++) b.del(x, row(8), z); // keep the brow line open
      b.paintBox(X0 - 1, row(8), h.z1 + 1, X1 + 1, row(8), h.z1 + 1, shade(shell, -0.2));
      for (let x = X0; x <= X1; x++) for (let r = 8; r <= 9; r++) b.del(x, row(r), h.z1 + 1);
      b.box(X0 - 1, row(8), h.z1 + 1, X0 - 1, row(9), h.z1 + 1, shell);
      b.box(X1 + 1, row(8), h.z1 + 1, X1 + 1, row(9), h.z1 + 1, shell);
      b.box(X0 - 1, row(1), 4, X0 - 1, row(7), 4, '#2E3226'); // straps
      b.box(X1 + 1, row(1), 4, X1 + 1, row(7), 4, '#2E3226');
      b.box(X1 + 2, row(9), 2, X1 + 2, row(10), 4, shade(shell, -0.25)); // side rail
      if (look.hat === 'nvg') {
        b.box(8, T, h.z1 + 2, 11, T + 1, h.z1 + 3, '#1E2024');
        b.box(8, row(6), h.z1 + 2, 11, T - 1, h.z1 + 2, '#1E2024');
        b.set(8, row(6), h.z1 + 3, '#5CFF8C');
        b.set(11, row(6), h.z1 + 3, '#5CFF8C');
      } else {
        b.box(8, T, h.z1 + 2, 11, T + 1, h.z1 + 2, '#2E3226'); // mount
      }
      break;
    }
    case 'cap':
      b.box(X0, T - 1, h.z0, X1, T + 1, h.z1, colour);
      b.box(X0 + 1, T - 1, h.z1 + 1, X1 - 1, T - 1, h.z1 + 3, shade(colour, -0.12));
      b.set(9, T + 2, 5, shade(colour, -0.2));
      break;
    case 'beanie':
      b.box(X0 - 1, T - 2, h.z0 - 1, X1 + 1, T + 2, h.z1 + 1, colour);
      b.paintBox(X0 - 1, T - 2, h.z0 - 1, X1 + 1, T - 2, h.z1 + 1, shade(colour, -0.16));
      b.box(9, T + 3, 4, 10, T + 4, 5, shade(colour, 0.2));
      break;
    case 'beret':
      b.box(X0 - 1, T + 1, h.z0, X1 + 1, T + 2, h.z1, '#7A1E2A');
      b.box(X1 + 1, T - 1, h.z0 + 1, X1 + 2, T + 1, h.z1 - 1, '#5E1620');
      b.box(7, T, h.z1 + 1, 8, T + 1, h.z1 + 1, '#C9A227');
      break;
    case 'balaclava':
      for (const [k] of [...b.m]) {
        const [x, y, z] = k.split(',').map(Number);
        if (y < h.y0 || y > h.y1 + 3) continue;
        const eyeBand = y >= row(5) && y <= row(7) && x >= 6 && x <= 13 && z >= fz;
        if (!eyeBand) b.set(x, y, z, '#22252A');
      }
      b.paintBox(8, 48, 4, 11, 49, 7, '#22252A');
      break;
    case 'boonie':
      b.box(X0 - 2, T, h.z0 - 2, X1 + 2, T, h.z1 + 2, '#7A6B48');
      b.box(X0, T + 1, h.z0, X1, T + 3, h.z1, '#8A7A55');
      b.paintBox(X0, T + 1, h.z0, X1, T + 1, h.z1, '#5E5238');
      break;
    case 'racehelm':
      b.box(X0 - 1, h.y0 - 1, h.z0 - 1, X1 + 1, T + 1, h.z1 + 1, colour);
      b.paintBox(X0 - 1, row(4), h.z1 + 1, X1 + 1, row(7), h.z1 + 1, '#15161A');
      b.paintBox(9, h.y0 - 1, h.z0 - 1, 10, T + 1, h.z1 + 1, '#FFFFFF');
      break;
    case 'tricorn':
      b.box(X0 - 2, T + 1, h.z0 - 1, X1 + 2, T + 1, h.z1 + 2, '#1C1D22');
      b.box(X0, T + 2, h.z0 + 1, X1, T + 3, h.z1 - 1, '#1C1D22');
      b.paintBox(X0 - 2, T + 1, h.z1 + 2, X1 + 2, T + 1, h.z1 + 2, '#C9A227');
      b.box(9, T + 2, h.z1, 10, T + 3, h.z1, '#ECEEF0');
      break;
    case 'headphones':
      b.box(X0 - 1, T + 1, 5, X1 + 1, T + 1, 5, '#2A2C30');
      b.box(X0 - 1, row(5), 5, X0 - 1, T, 5, '#2A2C30');
      b.box(X1 + 1, row(5), 5, X1 + 1, T, 5, '#2A2C30');
      b.box(X0 - 2, row(2), 3, X0 - 1, row(6), 7, '#E04B4B');
      b.box(X1 + 1, row(2), 3, X1 + 2, row(6), 7, '#E04B4B');
      break;
    case 'party':
      b.box(7, T + 1, 3, 12, T + 2, 7, '#FF5CA8');
      b.box(8, T + 3, 4, 11, T + 4, 6, '#FFE04B');
      b.box(9, T + 5, 5, 10, T + 6, 5, '#FF5CA8');
      break;
    case 'cat':
      b.box(X0, T + 1, 4, X0 + 2, T + 3, 5, '#2A2C30');
      b.box(X1 - 2, T + 1, 4, X1, T + 3, 5, '#2A2C30');
      b.set(X0 + 1, T + 2, 6, '#FF9BC8');
      b.set(X1 - 1, T + 2, 6, '#FF9BC8');
      break;
    case 'propeller':
      b.box(X0, T + 1, h.z0, X1, T + 2, h.z1, (x) => (x < 8 ? '#F2C230' : x < 12 ? '#3A6ED9' : '#D9483B'));
      b.box(9, T + 3, 5, 10, T + 4, 5, '#2A2C30');
      b.box(5, T + 5, 5, 14, T + 5, 5, '#3FA35B');
      break;
    case 'tophat':
      b.box(X0 - 2, T + 1, h.z0 - 1, X1 + 2, T + 1, h.z1 + 1, '#1E1E24');
      b.box(X0, T + 2, h.z0 + 1, X1, T + 9, h.z1 - 1, '#1E1E24');
      b.paintBox(X0, T + 2, h.z0 + 1, X1, T + 3, h.z1 - 1, '#B3261E');
      break;
    case 'horns':
      b.box(X0 - 1, row(7), h.z0 - 1, X1 + 1, T + 2, h.z1 + 1, '#9AA3AD');
      for (let x = X0; x <= X1; x++) for (let r = 7; r <= 8; r++) b.del(x, row(r), h.z1 + 1);
      b.box(9, row(2), h.z1 + 1, 10, row(8), h.z1 + 1, '#9AA3AD'); // nose guard
      b.box(X0 - 4, T, 4, X0 - 2, T + 1, 5, '#F2E6C8');
      b.box(X0 - 4, T + 2, 4, X0 - 3, T + 4, 5, '#F2E6C8');
      b.box(X1 + 2, T, 4, X1 + 4, T + 1, 5, '#F2E6C8');
      b.box(X1 + 3, T + 2, 4, X1 + 4, T + 4, 5, '#F2E6C8');
      break;
    case 'wizard':
      b.box(X0 - 3, T + 1, h.z0 - 2, X1 + 3, T + 1, h.z1 + 2, '#3A2384');
      b.box(X0, T + 2, h.z0 + 1, X1, T + 4, h.z1 - 1, '#4A2EA6');
      b.box(X0 + 2, T + 5, h.z0 + 2, X1 - 2, T + 7, h.z1 - 2, '#4A2EA6');
      b.box(X0 + 3, T + 8, 4, X1 - 3, T + 10, 6, '#4A2EA6');
      b.box(9, T + 11, 5, 10, T + 12, 5, '#4A2EA6');
      b.box(9, T + 3, h.z1, 10, T + 3, h.z1, '#FFE04B');
      break;
    case 'crown':
      b.ring(X0, h.z0 + 1, X1, h.z1 - 1, T + 1, '#F2C230');
      b.ring(X0, h.z0 + 1, X1, h.z1 - 1, T + 2, '#F2C230');
      for (const [x, z] of [
        [X0, h.z0 + 1],
        [X1, h.z0 + 1],
        [X0, h.z1 - 1],
        [X1, h.z1 - 1],
        [9, h.z1 - 1],
        [10, h.z1 - 1],
      ])
        b.set(x, T + 3, z, '#F2C230');
      b.set(9, T + 1, h.z1 - 1, '#D9483B');
      b.set(10, T + 1, h.z1 - 1, '#D9483B');
      break;
    case 'halo':
      b.ring(X0 + 1, h.z0 + 1, X1 - 1, h.z1 - 1, T + 4, '#FFE680');
      break;
  }

  return applyPose(b.voxels(), pose);
}

const isArm = (x: number, y: number, z: number) => (x <= 4 || x >= 15) && y >= 18 && y <= 48 && z >= 3;
const isLeg = (x: number, y: number) => y <= 25 && x >= 5 && x <= 14;

/** Bends the standing figure: legs and arms shear for a walk, arms rotate forward to reach or aim. */
function applyPose(voxels: Voxel[], pose: Pose): Voxel[] {
  const swing = pose.walk ?? 0;
  if (!swing && !pose.reach && !pose.aim) return voxels;
  const out = new Map<string, Voxel>();
  for (const [x, y, z, c] of voxels) {
    let [nx, ny, nz] = [x, y, z];
    const left = x <= 9;
    if (isArm(x, y, z)) {
      const forward = pose.reach || (pose.aim && !left);
      if (forward) {
        // swing the arm up round the shoulder until it points straight ahead
        ny = 44 + (z - 4);
        nz = 4 + (47 - y);
      } else if (swing) {
        nz = z - Math.round((left ? swing : -swing) * (47 - y) * 0.25);
      }
    } else if (swing && isLeg(x, y)) {
      nz = z + Math.round((left ? swing : -swing) * (25 - y) * 0.3);
    }
    out.set(`${nx},${ny},${nz}`, [nx, ny, nz, c]);
  }
  return [...out.values()];
}

/** Where the right hand closes, for holding things: the middle of the hand block. */
export const HAND = { x: 17.5, y: 23, z: 6 } as const;
/** The right hand when the aim pose holds the arm out in front. */
export const HAND_AIM = { x: 17.5, y: 46, z: 29 } as const;
