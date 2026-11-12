import { STOCK } from '@/arcade/loadout';

import { choose, newRun, offerUpgrades, perksFrom, RUN_SECONDS, runReward, step, weaponStats } from '../survivor';

function rngFrom(seed: number) {
  let t = seed;
  return () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };
}

const loadout = (stats = {}, hp = 100) => ({ weapon: weaponStats(STOCK, 0), perks: perksFrom(stats, hp, false) });

describe('dead hours', () => {
  it('stats from the home page make a run stronger, and a rough day starts it hurt', () => {
    const weak = perksFrom({}, 100, false);
    const strong = perksFrom({ STR: 120, AGI: 120, VIT: 120 }, 100, false);
    expect(strong.damage).toBeGreaterThan(weak.damage);
    expect(strong.moveSpeed).toBeGreaterThan(weak.moveSpeed);
    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(perksFrom({}, 20, false).maxHp).toBeLessThan(weak.maxHp);
  });

  it('a run walking in circles fights back, levels up and eventually ends', () => {
    const l = loadout();
    let s = newRun(l);
    const rng = rngFrom(3);
    let levelled = false;
    for (let i = 0; i < (RUN_SECONDS + 5) * 30 && !s.over; i++) {
      s = step(s, l, 1 / 30, { x: Math.cos(i / 90), y: Math.sin(i / 90) }, rng);
      if (s.choices) {
        levelled = true;
        s = choose(s, l, s.choices[0]);
      }
    }
    expect(s.kills).toBeGreaterThan(0);
    expect(levelled).toBe(true);
    expect(s.over).toBe(true);
    expect(runReward(s)).toBeGreaterThan(0);
  });

  it('offers three different upgrades and never a maxed one', () => {
    const offer = offerUpgrades({ damage: 5 }, 0.5, rngFrom(9));
    expect(new Set(offer).size).toBe(3);
    expect(offer).not.toContain('damage');
  });
});
