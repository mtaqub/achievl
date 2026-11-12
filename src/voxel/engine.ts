/**
 * A tiny voxel renderer: models are lists of coloured unit cubes, meshed into flat
 * quads once, then projected for any turn (yaw) and tilt (pitch) and painted back to front.
 */

export type Voxel = [x: number, y: number, z: number, color: string];

/** A set of voxels on its own grid, scaled and moved into the scene (a held weapon is a half-size layer). */
export interface Layer {
  voxels: Voxel[];
  scale?: number;
  offset?: [number, number, number];
  /** Swap axes before scaling: [worldAxisForX, worldAxisForY, worldAxisForZ] as 0 | 1 | 2. */
  axes?: [number, number, number];
}

type Vec = [number, number, number];

export interface Quad {
  pts: [Vec, Vec, Vec, Vec];
  normal: Vec;
  color: string;
}

const DIRS: { n: Vec; u: 0 | 1 | 2; v: 0 | 1 | 2; w: 0 | 1 | 2; s: 1 | -1 }[] = [
  { n: [1, 0, 0], w: 0, u: 2, v: 1, s: 1 },
  { n: [-1, 0, 0], w: 0, u: 2, v: 1, s: -1 },
  { n: [0, 1, 0], w: 1, u: 0, v: 2, s: 1 },
  { n: [0, -1, 0], w: 1, u: 0, v: 2, s: -1 },
  { n: [0, 0, 1], w: 2, u: 0, v: 1, s: 1 },
  { n: [0, 0, -1], w: 2, u: 0, v: 1, s: -1 },
];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Exposed faces merged into rectangles where neighbours share a plane and a colour. */
export function meshLayer(voxels: Voxel[]): Quad[] {
  const map = new Map<string, string>();
  for (const [x, y, z, c] of voxels) map.set(key(x, y, z), c);
  const quads: Quad[] = [];
  for (const dir of DIRS) {
    // slice -> colour -> set of "u,v"
    const slices = new Map<number, Map<string, Set<string>>>();
    for (const [k, c] of map) {
      const p = k.split(',').map(Number) as Vec;
      const q: Vec = [p[0] + dir.n[0], p[1] + dir.n[1], p[2] + dir.n[2]];
      if (map.has(key(q[0], q[1], q[2]))) continue;
      let byColour = slices.get(p[dir.w]);
      if (!byColour) slices.set(p[dir.w], (byColour = new Map()));
      let cells = byColour.get(c);
      if (!cells) byColour.set(c, (cells = new Set()));
      cells.add(`${p[dir.u]},${p[dir.v]}`);
    }
    for (const [w, byColour] of slices)
      for (const [color, cells] of byColour) {
        const left = new Set(cells);
        const sorted = [...cells].map((s) => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
        for (const [u0, v0] of sorted) {
          if (!left.has(`${u0},${v0}`)) continue;
          let u1 = u0;
          while (left.has(`${u1 + 1},${v0}`)) u1++;
          let v1 = v0;
          grow: for (;;) {
            for (let u = u0; u <= u1; u++) if (!left.has(`${u},${v1 + 1}`)) break grow;
            v1++;
          }
          for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) left.delete(`${u},${v}`);
          const plane = dir.s > 0 ? w + 1 : w;
          const corner = (u: number, v: number): Vec => {
            const out: Vec = [0, 0, 0];
            out[dir.w] = plane;
            out[dir.u] = u;
            out[dir.v] = v;
            return out;
          };
          quads.push({ pts: [corner(u0, v0), corner(u1 + 1, v0), corner(u1 + 1, v1 + 1), corner(u0, v1 + 1)], normal: dir.n, color });
        }
      }
  }
  return quads;
}

/** Meshes every layer and moves its quads into scene space. */
export function meshScene(layers: Layer[]): Quad[] {
  return layers.flatMap((layer) => {
    const s = layer.scale ?? 1;
    const o = layer.offset ?? [0, 0, 0];
    const axes = layer.axes ?? [0, 1, 2];
    const place = (p: Vec): Vec => {
      const out: Vec = [0, 0, 0];
      for (let i = 0; i < 3; i++) out[axes[i]] = p[i] * s;
      return [out[0] + o[0], out[1] + o[1], out[2] + o[2]];
    };
    const turn = (n: Vec): Vec => {
      const out: Vec = [0, 0, 0];
      for (let i = 0; i < 3; i++) out[axes[i]] = n[i];
      return out;
    };
    return meshLayer(layer.voxels).map((q) => ({ ...q, pts: q.pts.map(place) as Quad['pts'], normal: turn(q.normal) }));
  });
}

export interface Bounds {
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  minY: number;
  maxY: number;
}

export function bounds(quads: Quad[]): Bounds {
  let [x0, y0, z0, x1, y1, z1] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const q of quads)
    for (const [x, y, z] of q.pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      z0 = Math.min(z0, z);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      z1 = Math.max(z1, z);
    }
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return { cx, cy: (y0 + y1) / 2, cz, radius: Math.hypot(x1 - cx, z1 - cz), minY: y0, maxY: y1 };
}

function hex(c: string): Vec {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as Vec;
}
function toHex([r, g, b]: Vec): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

export interface Painted {
  d: string;
  fill: string;
}

/**
 * Projects quads for a view and returns svg polygons, far to near.
 * Screen units: one voxel = `unit` pixels; origin at the top-left of a box `width` x `height`.
 */
export function project(quads: Quad[], b: Bounds, yawDeg: number, pitchDeg: number, unit: number, width: number, height: number, muted = 0): Painted[] {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  const light: Vec = [-0.45, 0.75, 0.5];
  const ox = width / 2;
  const oy = height / 2;
  const view = (p: Vec) => {
    const x = p[0] - b.cx;
    const y = p[1] - b.cy;
    const z = p[2] - b.cz;
    const X = x * cy + z * sy;
    const Z = -x * sy + z * cy;
    return { sx: ox + X * unit, sy: oy - (y * cp - Z * sp) * unit, depth: Z * cp + y * sp };
  };
  const out: { depth: number; d: string; fill: string }[] = [];
  for (const q of quads) {
    const n = q.normal;
    const nX = n[0] * cy + n[2] * sy;
    const nZ = -n[0] * sy + n[2] * cy;
    const nY = n[1];
    // Facing the camera?
    if (nY * sp + nZ * cp <= 0.001) continue;
    const pts = q.pts.map(view);
    const lit = Math.max(0, nX * light[0] + nY * light[1] + nZ * light[2]);
    const k = 0.62 + 0.42 * lit;
    const rgb = hex(q.color);
    const grey = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
    const fill = toHex(rgb.map((c) => (c + (grey - c) * muted) * k) as Vec);
    const depth = pts.reduce((s, p) => s + p.depth, 0) / 4;
    out.push({ depth, fill, d: `M${pts.map((p) => `${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join('L')}Z` });
  }
  out.sort((a, b) => a.depth - b.depth);
  return out;
}

/** How many pixels a voxel can be so the model fits the box at every turn. */
export function fitUnit(b: Bounds, pitchDeg: number, width: number, height: number, margin = 0.92): number {
  const pitch = (pitchDeg * Math.PI) / 180;
  const w = b.radius * 2;
  const h = (b.maxY - b.minY) * Math.cos(pitch) + b.radius * 2 * Math.sin(pitch);
  return Math.min((width * margin) / w, (height * margin) / h);
}

/**
 * Joins neighbouring polygons that share a fill into one path. Draw order is kept, so the
 * picture is identical; there are just far fewer svg elements (much faster on phones).
 */
export function mergeRuns(polys: Painted[]): Painted[] {
  const out: Painted[] = [];
  for (const p of polys) {
    const last = out[out.length - 1];
    if (last && last.fill === p.fill) last.d += p.d;
    else out.push({ ...p });
  }
  return out;
}

export interface Sprite {
  polys: Painted[];
  /** Pixels from the sprite's origin up to the top of its bounding circle. */
  height: number;
}

/**
 * A projected model with its feet at (0, 0), for drawing many figures in one scene.
 * `unit` is scene units per voxel.
 */
export function sprite(quads: Quad[], b: Bounds, yawDeg: number, pitchDeg: number, unit: number, muted = 0): Sprite {
  const pitch = (pitchDeg * Math.PI) / 180;
  const feet = (b.cy - b.minY) * Math.cos(pitch) * unit;
  const polys = project(quads, b, yawDeg, pitchDeg, unit, 0, -2 * feet, muted);
  return { polys: mergeRuns(polys), height: (b.maxY - b.minY) * Math.cos(pitch) * unit + b.radius * Math.sin(pitch) * unit };
}

/**
 * One path per colour, ordered by each colour's average depth. Much cheaper than `mergeRuns`
 * but can misorder overlapping parts slightly; meant for small figures drawn by the dozen.
 */
export function groupByFill(polys: Painted[]): Painted[] {
  const groups = new Map<string, { d: string; sum: number; n: number }>();
  polys.forEach((p, i) => {
    const g = groups.get(p.fill) ?? { d: '', sum: 0, n: 0 };
    g.d += p.d;
    g.sum += i;
    g.n++;
    groups.set(p.fill, g);
  });
  return [...groups].sort((a, b) => a[1].sum / a[1].n - b[1].sum / b[1].n).map(([fill, g]) => ({ fill, d: g.d }));
}
