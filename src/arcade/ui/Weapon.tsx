import React, { useMemo } from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { CrateItem, Pattern, Silhouette, WeaponMod } from '../types';

/**
 * Voxel weapons: each silhouette is a 30 x 12 grid of blocks. Every block gets a front
 * face, plus a lit top face and a shaded side face where nothing sits above or beside it.
 */

const C = 4; // block size on the 120 x 48 canvas
const DEPTH = 2.4;

const GRIDS: Record<Silhouette, string[]> = {
  pistol: [
    '..............................',
    '...######################.....',
    '...######################.....',
    '...#######################....',
    '...##########.######..........',
    '......#####..#...#............',
    '......#####...###.............',
    '.....#####....................',
    '.....#####....................',
    '....#####.....................',
    '....#####.....................',
    '..............................',
  ],
  smg: [
    '..............................',
    '....###################.......',
    '..########################....',
    '..##########################..',
    '..######################......',
    '..#.....#####..######.........',
    '..#.....####...######.........',
    '..###..####....#####..........',
    '.......####....#####..........',
    '...............####...........',
    '..............................',
    '..............................',
  ],
  rifle: [
    '..............................',
    '..............................',
    '........................##....',
    '......###################.....',
    '####.#########################',
    '##############################',
    '##########...#######..........',
    '###.......####..#####.........',
    '##........###....####.........',
    '..........###.....####........',
    '...................###........',
    '..............................',
  ],
  sniper: [
    '..............................',
    '.........##########...........',
    '..........#......#............',
    '......########################',
    '#############################.',
    '##############................',
    '###.......####................',
    '##........###.................',
    '..........###.................',
    '..............................',
    '..............................',
    '..............................',
  ],
  knife: [
    '..............................',
    '..............................',
    '..............................',
    '....###########...............',
    '..##############.##...........',
    '################.##.#########.',
    '..##############.##.##########',
    '....###########..##.#########.',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
  ],
  karambit: [
    '##########....................',
    '.###########..................',
    '......########................',
    '..........######..............',
    '............#####.............',
    '.............#######..........',
    '..............########........',
    '...............###..###.......',
    '...............##....##.......',
    '...............##....##.......',
    '................######........',
    '..............................',
  ],
};

/** Extra blocks per mod and silhouette: [col, row]. */
const MOD_CELLS: Record<WeaponMod, Partial<Record<Silhouette, [number, number][]>>> = {
  scope: {
    pistol: [
      [12, 0],
      [13, 0],
      [14, 0],
    ],
    smg: [
      [10, 0],
      [11, 0],
      [12, 0],
      [13, 0],
    ],
    rifle: [
      [10, 2],
      [11, 2],
      [12, 2],
      [13, 2],
      [14, 2],
      [10, 1],
      [11, 1],
      [12, 1],
      [13, 1],
      [14, 1],
    ],
    sniper: [
      [8, 1],
      [19, 1],
      [7, 1],
    ],
  },
  muzzle: {
    pistol: [
      [26, 3],
      [27, 3],
      [26, 2],
      [27, 2],
    ],
    smg: [
      [28, 3],
      [29, 3],
    ],
    rifle: [[29, 3]],
    sniper: [
      [29, 4],
      [28, 4],
    ],
  },
  tape: {},
  gem: {},
  glow: {},
};

const GEM_AT: Record<Silhouette, [number, number]> = {
  pistol: [18, 2],
  smg: [17, 3],
  rifle: [20, 5],
  sniper: [22, 4],
  knife: [17, 5],
  karambit: [18, 10],
};

const GRIP: Record<Silhouette, [number, number][]> = {
  pistol: [
    [5, 8],
    [6, 8],
    [5, 9],
    [4, 10],
  ],
  smg: [
    [8, 7],
    [9, 7],
    [8, 8],
    [9, 8],
  ],
  rifle: [
    [11, 7],
    [12, 7],
    [11, 8],
    [12, 8],
  ],
  sniper: [
    [11, 6],
    [12, 6],
    [11, 7],
    [12, 7],
  ],
  knife: [
    [22, 5],
    [24, 6],
    [26, 5],
    [28, 6],
  ],
  karambit: [
    [16, 8],
    [16, 9],
  ],
};

/** Small deterministic random numbers so a pattern looks the same every time. */
function seeded(seed: number) {
  let t = seed >>> 0 || 1;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

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

function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, '#FFFFFF', amount) : mix(hex, '#000000', -amount);
}

/** The finish colour at a column: the paint stops run left to right. */
function paintAt(paint: readonly string[], col: number): string {
  const t = (col / 29) * (paint.length - 1);
  const i = Math.min(paint.length - 2, Math.floor(t));
  return mix(paint[i], paint[i + 1], t - i);
}

/** Whether the pattern marks a block. */
function marked(pattern: Pattern, c: number, r: number, shift: number, noise: number): boolean {
  switch (pattern) {
    case 'stripes':
      return (c + r + shift) % 4 === 0;
    case 'camo':
      return (Math.floor((c + shift) / 3) * 7 + Math.floor(r / 2) * 13 + shift) % 5 < 2;
    case 'flames':
      return r > 7 - Math.round(2 * Math.sin((c + shift) * 1.3)) - (c % 3);
    case 'scales':
      return (r % 2 === 0 && (c + shift) % 4 === 0) || (r % 2 === 1 && (c + shift) % 4 === 2);
    case 'circuit':
      return r % 4 === 1 ? (c + shift) % 6 !== 5 : (c + shift) % 6 === 0;
    case 'checker':
      return (c + r + shift) % 2 === 0;
    case 'waves':
      return (r + Math.round(1.4 * Math.sin((c + shift) / 1.6))) % 4 === 0;
    case 'dots':
      return (c + shift) % 3 === 0 && r % 2 === 0;
    case 'pixels':
      return noise < 0.32;
    case 'hex':
      return (r % 3 === 0 && (c + shift) % 3 !== 2) || (r % 3 !== 0 && (c + shift + (r % 3)) % 3 === 0);
    case 'splatter':
      return noise < 0.14;
    case 'bolts':
      return (c + shift) % 8 === (r % 4 < 2 ? r % 4 : 3 - (r % 4));
    case 'stars':
      return noise < 0.09;
    case 'bricks':
      return r % 3 === 0 || (c + (Math.floor(r / 3) % 2) * 3 + shift) % 6 === 0;
    default:
      return false;
  }
}

/** The coloured blocks of a weapon, shared by the flat art and the 3d model. */
export function weaponBlocks(item: CrateItem, wear: number, patternSeed: number) {
  const rnd = seeded(patternSeed);
  const shift = Math.floor(rnd() * 12);
  const grid = GRIDS[item.shape].map((row) => row.split('').map((ch) => ch === '#'));
  const extra = new Map<string, string>();
  if (item.mod) for (const [c, r] of MOD_CELLS[item.mod][item.shape] ?? []) extra.set(`${c},${r}`, '#2E3238');
  if (item.mod === 'tape') for (const [c, r] of GRIP[item.shape]) extra.set(`${c},${r}`, item.paint[item.paint.length - 1]);
  if (item.mod === 'gem') extra.set(`${GEM_AT[item.shape][0]},${GEM_AT[item.shape][1]}`, '#FFFFFF');
  const filled = (c: number, r: number) => (grid[r]?.[c] ?? false) || extra.has(`${c},${r}`);
  const ink = item.paint.length > 2 ? item.paint[2] : shade(item.paint[1], -0.35);

  const out: { c: number; r: number; front: string; top: boolean; side: boolean }[] = [];
  for (let r = 0; r < 12; r++)
    for (let c = 0; c < 30; c++) {
      if (!filled(c, r)) continue;
      const noise = rnd();
      let front = extra.get(`${c},${r}`) ?? paintAt(item.paint, c);
      if (!extra.has(`${c},${r}`) && marked(item.pattern, c, r, shift, noise)) front = mix(front, ink, 0.6);
      if (item.mod === 'gem' && extra.get(`${c},${r}`) === '#FFFFFF') front = item.paint[0];
      if (rnd() < wear * 0.4) front = mix(front, '#C9CDD2', 0.55);
      out.push({ c, r, front, top: !filled(c, r - 1), side: !filled(c + 1, r) });
    }
  return out;
}

interface Props {
  item: CrateItem;
  width?: number;
  /** Kept for callers; voxel art needs no svg ids. */
  uid: string;
  /** 0 is mint, 1 is battered; chips blocks. */
  wear?: number;
  /** Shifts the pattern so two drops of one finish never look identical. */
  seed?: number;
  /** One flat colour, no shading (the inspect screen's edge layers). */
  tint?: string;
}

/** A voxel weapon painted with its finish, pattern, mod and wear. */
export function Weapon({ item, width = 96, wear = 0, seed, tint }: Props) {
  const patternSeed = seed ?? hashText(item.id);
  const blocks = useMemo(() => weaponBlocks(item, wear, patternSeed), [item, patternSeed, wear]);

  const glow = item.mod === 'glow' && !tint;

  return (
    <Svg width={width} height={width * 0.42} viewBox="-2 -4 126 53" accessibilityLabel={`${item.weapon} ${item.finish}`}>
      {glow &&
        blocks.map((b) => <Rect key={`g${b.c},${b.r}`} x={b.c * C - 1.5} y={b.r * C - 1.5} width={C + 3} height={C + 3} fill={item.paint[0]} opacity={0.22} />)}
      {!tint && (
        <G>
          {blocks.map((b) => (
            <G key={`e${b.c},${b.r}`}>
              {b.top && <Path d={`M${b.c * C} ${b.r * C} l${DEPTH} ${-DEPTH} h${C} l${-DEPTH} ${DEPTH} Z`} fill={shade(b.front, 0.22)} />}
              {b.side && <Path d={`M${(b.c + 1) * C} ${b.r * C} l${DEPTH} ${-DEPTH} v${C} l${-DEPTH} ${DEPTH} Z`} fill={shade(b.front, -0.32)} />}
            </G>
          ))}
        </G>
      )}
      {blocks.map((b) => (
        <Rect key={`f${b.c},${b.r}`} x={b.c * C} y={b.r * C} width={C + 0.15} height={C + 0.15} fill={tint ?? b.front} />
      ))}
    </Svg>
  );
}

/** The weapon as 3d voxels: two blocks deep, barrel along +x, standing on y. */
export function weaponVoxels(item: CrateItem, wear = 0, seed?: number): [number, number, number, string][] {
  const blocks = weaponBlocks(item, wear, seed ?? hashText(item.id));
  return blocks.flatMap((b) => [
    [b.c, 11 - b.r, 0, b.front] as [number, number, number, string],
    [b.c, 11 - b.r, 1, b.front] as [number, number, number, string],
  ]);
}
