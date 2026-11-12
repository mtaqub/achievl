import { STOCK } from '@/arcade/loadout';
import { buildAvatar } from '@/avatar/model';
import { DEFAULT_LOOK } from '@/avatar/parts';
import { bounds, mergeRuns, meshScene, project } from '@/voxel/engine';

import { playerSprite, yawFor, zombieSprite } from '../sprites';

describe('voxel sprites', () => {
  it('keeps every figure cheap enough to draw dozens a frame', () => {
    const counts = (['walker', 'runner', 'brute', 'boss'] as const).flatMap((k) => [0, 45, 90, 180].map((yaw) => zombieSprite(k, yaw, 0).polys.length));
    expect(Math.max(...counts)).toBeLessThan(40);
    const p = playerSprite(DEFAULT_LOOK, { item: STOCK, wear: 0, seed: 1 }, 0, 1).polys.length;
    expect(p).toBeLessThan(400);
  });

  it('merging neighbouring same-colour polygons never changes the drawing order', () => {
    const quads = meshScene([{ voxels: buildAvatar(DEFAULT_LOOK) }]);
    const raw = project(quads, bounds(quads), -28, 14, 4, 200, 200);
    const merged = mergeRuns(raw);
    expect(merged.length).toBeLessThan(raw.length);
    expect(merged.map((m) => m.d).join('')).toBe(raw.map((r) => r.d).join(''));
  });

  it('walking moves the legs', () => {
    const still = buildAvatar(DEFAULT_LOOK).filter(([, y]) => y < 5);
    const step = buildAvatar(DEFAULT_LOOK, { walk: 1 }).filter(([, y]) => y < 5);
    expect(step.map(([, , z]) => z).join()).not.toBe(still.map(([, , z]) => z).join());
  });

  it('faces down the screen towards the camera at yaw 0', () => {
    expect(yawFor(Math.PI / 2)).toBe(0);
    expect(yawFor(0)).toBe(90);
    expect(yawFor(-Math.PI / 2)).toBe(180);
  });
});
