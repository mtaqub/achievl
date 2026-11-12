/**
 * Dead Hours: a top-down zombie survivor run. The avatar fires the equipped weapon on its own;
 * the player only moves. Collect shards, level up, pick upgrades, outlast the night (5:00),
 * and put down the boss that arrives at 4:00.
 *
 * Pure rules: no React, no timers. `step` advances the world by `dt` seconds.
 */
import { CrateItem, Rarity, Silhouette } from '@/arcade/types';
import { Stats } from '@/game/types';

export type Rng = () => number;

export const RUN_SECONDS = 300;
export const BOSS_AT = 240;
export const ARENA = 1400; // square world, player starts in the middle

/* ---------------------------------------------------------------- loadout */

export interface WeaponStats {
  damage: number;
  /** Shots (or swings) a second. */
  rate: number;
  speed: number;
  range: number;
  pierce: number;
  /** Melee weapons swing an arc round the player instead of firing. */
  melee: boolean;
  spread: number;
}

const BASE: Record<Silhouette, WeaponStats> = {
  pistol: { damage: 14, rate: 2.6, speed: 620, range: 330, pierce: 0, melee: false, spread: 0.04 },
  smg: { damage: 7, rate: 8, speed: 640, range: 290, pierce: 0, melee: false, spread: 0.14 },
  rifle: { damage: 12, rate: 5, speed: 760, range: 380, pierce: 1, melee: false, spread: 0.06 },
  sniper: { damage: 48, rate: 0.9, speed: 1100, range: 560, pierce: 5, melee: false, spread: 0 },
  knife: { damage: 26, rate: 2.2, speed: 0, range: 90, pierce: 99, melee: true, spread: 0 },
  karambit: { damage: 22, rate: 2.8, speed: 0, range: 84, pierce: 99, melee: true, spread: 0 },
};

const RARITY_BONUS: Record<Rarity, number> = { common: 1, uncommon: 1.06, rare: 1.13, epic: 1.22, legendary: 1.35 };

/** The equipped item's numbers: shape sets the type, rarity and wear tune it, foil adds crits. */
export function weaponStats(item: CrateItem, wear: number): WeaponStats {
  const base = BASE[item.shape];
  return { ...base, damage: base.damage * RARITY_BONUS[item.rarity] * (1.04 - wear * 0.08) };
}

/** What the home page's numbers give a run. Stats grow without limit, so bonuses ease off. */
export interface Perks {
  damage: number;
  fireRate: number;
  moveSpeed: number;
  maxHp: number;
  xpGain: number;
  magnet: number;
  armor: number;
  luck: number;
  crit: number;
}

const ease = (v: number, at: number) => 1 - Math.exp(-Math.max(0, v) / at);

export function perksFrom(stats: Partial<Stats>, todayHp: number, foil: boolean): Perks {
  const s = (k: keyof Stats) => stats[k] ?? 0;
  return {
    damage: 1 + 0.5 * ease(s('STR'), 60),
    fireRate: 1 + 0.3 * ease(s('AGI'), 60),
    moveSpeed: 1 + 0.25 * ease(s('AGI'), 60),
    // Today's health meter matters: a rough day starts the run hurt.
    maxHp: Math.round((100 + 80 * ease(s('VIT'), 60)) * (0.6 + 0.4 * Math.min(1, Math.max(0, todayHp / 100)))),
    xpGain: 1 + 0.5 * ease(s('INT'), 60),
    magnet: 70 + 60 * ease(s('INT'), 60),
    armor: 0.3 * ease(s('WIL'), 60),
    luck: ease(s('CHA'), 60),
    crit: 0.05 + (foil ? 0.1 : 0) + 0.1 * ease(s('CHA'), 60),
  };
}

/* ---------------------------------------------------------------- upgrades */

export type UpgradeId = 'damage' | 'rate' | 'multishot' | 'pierce' | 'speed' | 'vigor' | 'magnet' | 'halo' | 'nova' | 'mend';

export const UPGRADES: Record<UpgradeId, { name: string; blurb: string; icon: string; max: number }> = {
  damage: { name: 'hollow points', blurb: '+20% damage', icon: 'bullet', max: 5 },
  rate: { name: 'quick hands', blurb: '+15% fire rate', icon: 'flash', max: 5 },
  multishot: { name: 'extra barrel', blurb: '+1 projectile', icon: 'call-split', max: 4 },
  pierce: { name: 'armour piercing', blurb: 'shots pass through +1 more', icon: 'arrow-collapse-right', max: 3 },
  speed: { name: 'light boots', blurb: '+10% move speed', icon: 'shoe-sneaker', max: 4 },
  vigor: { name: 'field rations', blurb: '+25 max health, heal 25', icon: 'food-drumstick', max: 5 },
  magnet: { name: 'scavenger', blurb: 'pick up shards from further away', icon: 'magnet', max: 3 },
  halo: { name: 'blade ring', blurb: 'spinning blades orbit you', icon: 'saw-blade', max: 4 },
  nova: { name: 'shock nova', blurb: 'a blast hits everything nearby', icon: 'radioactive', max: 4 },
  mend: { name: 'first aid', blurb: 'slowly regain health', icon: 'medical-bag', max: 3 },
};
export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** Three different upgrades not yet maxed. Luck (charisma) sometimes swaps in a rarer pick. */
export function offerUpgrades(levels: Partial<Record<UpgradeId, number>>, luck: number, rng: Rng): UpgradeId[] {
  const open = UPGRADE_IDS.filter((id) => (levels[id] ?? 0) < UPGRADES[id].max);
  const strong: UpgradeId[] = ['multishot', 'halo', 'nova'];
  const pool = [...open];
  const out: UpgradeId[] = [];
  while (out.length < 3 && pool.length > 0) {
    const preferStrong = rng() < 0.15 + luck * 0.25;
    const choices = preferStrong ? pool.filter((p) => strong.includes(p)) : pool;
    const from = choices.length > 0 ? choices : pool;
    const pick = from[Math.floor(rng() * from.length)];
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

/* ---------------------------------------------------------------- world */

export type ZombieKind = 'walker' | 'runner' | 'brute' | 'boss';

export const ZOMBIES: Record<ZombieKind, { hp: number; speed: number; radius: number; damage: number; xp: number }> = {
  walker: { hp: 22, speed: 52, radius: 14, damage: 8, xp: 1 },
  runner: { hp: 12, speed: 112, radius: 11, damage: 6, xp: 1 },
  brute: { hp: 120, speed: 38, radius: 22, damage: 18, xp: 5 },
  boss: { hp: 2600, speed: 46, radius: 40, damage: 30, xp: 60 },
};

export interface Zombie {
  id: number;
  kind: ZombieKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Seconds left of the hit flash. */
  flash: number;
  /** Boss only: seconds until the next slam, and where it lands. */
  slamIn?: number;
  slam?: { x: number; y: number; t: number };
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  pierce: number;
  hit: number[];
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
}

export interface Effect {
  id: number;
  kind: 'swing' | 'nova' | 'hit';
  x: number;
  y: number;
  angle: number;
  t: number;
  radius: number;
}

export interface RunState {
  t: number;
  over: boolean;
  won: boolean;
  bossDown: boolean;
  player: { x: number; y: number; hp: number; maxHp: number; level: number; xp: number; next: number; face: number; aim: number; hurt: number };
  levels: Partial<Record<UpgradeId, number>>;
  /** Upgrade choices waiting for the player; the world pauses while set. */
  choices: UpgradeId[] | null;
  zombies: Zombie[];
  bullets: Bullet[];
  gems: Gem[];
  effects: Effect[];
  kills: number;
  cooldown: number;
  novaIn: number;
  spawnIn: number;
  nextId: number;
  bossSpawned: boolean;
}

export interface Loadout {
  weapon: WeaponStats;
  perks: Perks;
}

export function newRun(loadout: Loadout): RunState {
  return {
    t: 0,
    over: false,
    won: false,
    bossDown: false,
    player: { x: ARENA / 2, y: ARENA / 2, hp: loadout.perks.maxHp, maxHp: loadout.perks.maxHp, level: 1, xp: 0, next: 5, face: 0, aim: 0, hurt: 0 },
    levels: {},
    choices: null,
    zombies: [],
    bullets: [],
    gems: [],
    effects: [],
    kills: 0,
    cooldown: 0,
    novaIn: 4,
    spawnIn: 0.5,
    nextId: 1,
    bossSpawned: false,
  };
}

const lv = (s: RunState, id: UpgradeId) => s.levels[id] ?? 0;

export function moveSpeed(s: RunState, l: Loadout) {
  return 170 * l.perks.moveSpeed * (1 + 0.1 * lv(s, 'speed'));
}

function damageRoll(s: RunState, l: Loadout, base: number, rng: Rng) {
  const crit = rng() < l.perks.crit;
  return base * l.perks.damage * (1 + 0.2 * lv(s, 'damage')) * (crit ? 2 : 1);
}

function spawnZombie(s: RunState, kind: ZombieKind, rng: Rng) {
  const a = rng() * Math.PI * 2;
  const r = 430 + rng() * 80;
  const scale = 1 + s.t / 150; // they toughen as the night goes on
  const hp = ZOMBIES[kind].hp * (kind === 'boss' ? 1 : scale);
  s.zombies.push({
    id: s.nextId++,
    kind,
    x: Math.min(ARENA, Math.max(0, s.player.x + Math.cos(a) * r)),
    y: Math.min(ARENA, Math.max(0, s.player.y + Math.sin(a) * r)),
    hp,
    maxHp: hp,
    flash: 0,
    ...(kind === 'boss' ? { slamIn: 3 } : {}),
  });
}

function hurt(s: RunState, z: Zombie, amount: number) {
  z.hp -= amount;
  z.flash = 0.08;
}

/** Applies a picked upgrade and resumes. */
export function choose(s: RunState, l: Loadout, id: UpgradeId): RunState {
  const levels = { ...s.levels, [id]: lv(s, id) + 1 };
  const player = { ...s.player };
  if (id === 'vigor') {
    player.maxHp += 25;
    player.hp = Math.min(player.maxHp, player.hp + 25);
  }
  return { ...s, levels, player, choices: null };
}

/**
 * Advances the run. `input` is the move direction (length 0..1). Mutates a copy-free
 * working state for speed; callers keep one state object per run.
 */
export function step(s: RunState, l: Loadout, dt: number, input: { x: number; y: number }, rng: Rng): RunState {
  if (s.over || s.choices) return s;
  dt = Math.min(dt, 0.05);
  s.t += dt;
  const p = s.player;

  // move
  const len = Math.hypot(input.x, input.y);
  if (len > 0.05) {
    const k = Math.min(1, len) / len;
    p.x = Math.min(ARENA, Math.max(0, p.x + input.x * k * moveSpeed(s, l) * dt));
    p.y = Math.min(ARENA, Math.max(0, p.y + input.y * k * moveSpeed(s, l) * dt));
    p.face = Math.atan2(input.y, input.x);
  }
  p.hurt = Math.max(0, p.hurt - dt);
  if (lv(s, 'mend') > 0) p.hp = Math.min(p.maxHp, p.hp + lv(s, 'mend') * 0.8 * dt);

  // spawn: a steady trickle that thickens; runners after 0:40, brutes after 1:30, boss at 4:00
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    const wave = 1 + Math.floor(s.t / 30);
    for (let i = 0; i < wave; i++) {
      const roll = rng();
      const kind: ZombieKind = s.t > 90 && roll < 0.1 ? 'brute' : s.t > 40 && roll < 0.38 ? 'runner' : 'walker';
      if (s.zombies.length < 140) spawnZombie(s, kind, rng);
    }
    s.spawnIn = Math.max(0.35, 1.5 - s.t / 200);
  }
  if (!s.bossSpawned && s.t >= BOSS_AT) {
    s.bossSpawned = true;
    spawnZombie(s, 'boss', rng);
  }

  // zombies walk in and bite
  for (const z of s.zombies) {
    const def = ZOMBIES[z.kind];
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const d = Math.hypot(dx, dy) || 1;
    z.flash = Math.max(0, z.flash - dt);
    if (z.kind === 'boss') {
      z.slamIn = (z.slamIn ?? 3) - dt;
      if (!z.slam && z.slamIn <= 0) {
        z.slam = { x: p.x, y: p.y, t: 1.1 }; // telegraphed: a circle on the ground first
      }
      if (z.slam) {
        z.slam.t -= dt;
        if (z.slam.t <= 0) {
          if (Math.hypot(p.x - z.slam.x, p.y - z.slam.y) < 110) {
            p.hp -= 34 * (1 - l.perks.armor);
            p.hurt = 0.3;
          }
          s.effects.push({ id: s.nextId++, kind: 'nova', x: z.slam.x, y: z.slam.y, angle: 0, t: 0.35, radius: 110 });
          z.slam = undefined;
          z.slamIn = 3.2;
        }
        continue; // stands still while winding up
      }
    }
    z.x += (dx / d) * def.speed * dt;
    z.y += (dy / d) * def.speed * dt;
    if (d < def.radius + 14 && p.hurt <= 0) {
      p.hp -= def.damage * (1 - l.perks.armor);
      p.hurt = 0.45;
    }
  }
  // keep them from stacking into one blob
  for (let i = 0; i < s.zombies.length; i++)
    for (let j = i + 1; j < Math.min(s.zombies.length, i + 12); j++) {
      const a = s.zombies[i];
      const b = s.zombies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = ZOMBIES[a.kind].radius + ZOMBIES[b.kind].radius;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < min) {
        const push = (min - d) / 2 / d;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }

  // the weapon fires itself at the closest zombie in range
  s.cooldown -= dt;
  const w = l.weapon;
  let target: Zombie | null = null;
  let best = w.melee ? w.range + 30 : w.range;
  for (const z of s.zombies) {
    const d = Math.hypot(z.x - p.x, z.y - p.y) - ZOMBIES[z.kind].radius;
    if (d < best) {
      best = d;
      target = z;
    }
  }
  if (target) p.aim = Math.atan2(target.y - p.y, target.x - p.x);
  if (target && s.cooldown <= 0) {
    s.cooldown = 1 / (w.rate * l.perks.fireRate * (1 + 0.15 * lv(s, 'rate')));
    const shots = 1 + lv(s, 'multishot');
    if (w.melee) {
      const reach = w.range * (1 + 0.15 * lv(s, 'multishot'));
      for (const z of s.zombies) {
        const d = Math.hypot(z.x - p.x, z.y - p.y);
        let diff = Math.atan2(z.y - p.y, z.x - p.x) - p.aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (d < reach + ZOMBIES[z.kind].radius && Math.abs(diff) < 1.2) hurt(s, z, damageRoll(s, l, w.damage, rng));
      }
      s.effects.push({ id: s.nextId++, kind: 'swing', x: p.x, y: p.y, angle: p.aim, t: 0.18, radius: reach });
    } else {
      for (let i = 0; i < shots; i++) {
        const fan = (i - (shots - 1) / 2) * 0.14 + (rng() - 0.5) * w.spread;
        const a = p.aim + fan;
        s.bullets.push({
          id: s.nextId++,
          x: p.x + Math.cos(a) * 18,
          y: p.y + Math.sin(a) * 18,
          vx: Math.cos(a) * w.speed,
          vy: Math.sin(a) * w.speed,
          life: w.range / w.speed,
          pierce: w.pierce + lv(s, 'pierce'),
          hit: [],
        });
      }
    }
  }

  // bullets
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const z of s.zombies) {
      if (b.life <= 0 || z.hp <= 0 || b.hit.includes(z.id)) continue;
      if (Math.hypot(z.x - b.x, z.y - b.y) < ZOMBIES[z.kind].radius + 4) {
        hurt(s, z, damageRoll(s, l, w.damage, rng));
        b.hit.push(z.id);
        if (b.hit.length > b.pierce) b.life = 0;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);

  // blade ring
  const blades = lv(s, 'halo');
  if (blades > 0) {
    for (let i = 0; i < blades + 1; i++) {
      const a = s.t * 3 + (i * Math.PI * 2) / (blades + 1);
      const bx = p.x + Math.cos(a) * 70;
      const by = p.y + Math.sin(a) * 70;
      for (const z of s.zombies) if (Math.hypot(z.x - bx, z.y - by) < ZOMBIES[z.kind].radius + 12) hurt(s, z, 40 * dt * l.perks.damage * (1 + 0.25 * blades));
    }
  }

  // shock nova
  const nova = lv(s, 'nova');
  if (nova > 0) {
    s.novaIn -= dt;
    if (s.novaIn <= 0) {
      const radius = 120 + nova * 25;
      for (const z of s.zombies) if (Math.hypot(z.x - p.x, z.y - p.y) < radius) hurt(s, z, damageRoll(s, l, 18 + nova * 10, rng));
      s.effects.push({ id: s.nextId++, kind: 'nova', x: p.x, y: p.y, angle: 0, t: 0.35, radius });
      s.novaIn = Math.max(1.5, 4 - nova * 0.5);
    }
  }

  // deaths drop shards
  const alive: Zombie[] = [];
  for (const z of s.zombies) {
    if (z.hp > 0) {
      alive.push(z);
      continue;
    }
    s.kills++;
    if (z.kind === 'boss') s.bossDown = true;
    s.gems.push({ id: s.nextId++, x: z.x, y: z.y, value: ZOMBIES[z.kind].xp });
    s.effects.push({ id: s.nextId++, kind: 'hit', x: z.x, y: z.y, angle: 0, t: 0.25, radius: ZOMBIES[z.kind].radius });
  }
  s.zombies = alive;

  // shards fly to the player inside the magnet radius
  const magnet = l.perks.magnet * (1 + 0.5 * lv(s, 'magnet'));
  const kept: Gem[] = [];
  for (const g of s.gems) {
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 18) {
      p.xp += g.value * l.perks.xpGain;
      continue;
    }
    if (d < magnet) {
      g.x += (dx / d) * 420 * dt;
      g.y += (dy / d) * 420 * dt;
    }
    kept.push(g);
  }
  s.gems = kept.length > 400 ? kept.slice(-400) : kept;

  if (p.xp >= p.next) {
    p.xp -= p.next;
    p.level++;
    p.next = Math.round(5 + p.level * 4 + p.level * p.level * 0.6);
    s.choices = offerUpgrades(s.levels, l.perks.luck, rng);
  }

  for (const e of s.effects) e.t -= dt;
  s.effects = s.effects.filter((e) => e.t > 0);

  if (p.hp <= 0) {
    p.hp = 0;
    s.over = true;
  } else if (s.t >= RUN_SECONDS) {
    s.over = true;
    s.won = true;
  }
  return s;
}

/** Shards paid into the arcade wallet at the end of a run. */
export function runReward(s: RunState): number {
  return Math.floor(s.kills / 8) + Math.floor(s.t / 30) + (s.won ? 25 : 0) + (s.bossDown ? 40 : 0);
}
