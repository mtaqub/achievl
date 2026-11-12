import { Pattern, WeaponMod } from './types';

/**
 * Finish names, patterns and flavour text. Each name nods to gaming culture with
 * original wordplay; no real game titles, characters or quotes.
 * Keyed by item id, which never changes, so saved inventories keep working.
 */
export const SKINS: Record<string, { finish: string; pattern: Pattern; mod?: WeaponMod; lore: string }> = {
  // press start
  'dawn:mp5-chalk-line': { finish: 'insert coin', pattern: 'dots', lore: 'the first quarter always goes in crooked.' },
  'dawn:p250-wet-cement': { finish: 'tutorial level', pattern: 'checker', lore: 'press the button to jump. you already knew that.' },
  'dawn:mac-10-tin-roof': { finish: 'brick breaker', pattern: 'bricks', lore: 'one ball, one paddle, one more go.' },
  'dawn:famas-cardboard-fort': { finish: 'box sneak', pattern: 'camo', mod: 'tape', lore: 'nobody suspects the cardboard box.' },
  'dawn:galil-moss-wall': { finish: 'grass type', pattern: 'scales', lore: 'super effective against rock walls.' },
  'dawn:five-seven-dry-river': { finish: 'desert temple', pattern: 'hex', lore: 'the floor is a trap. so is the ceiling.' },
  'dawn:ump-45-pencil-sketch': { finish: 'graph paper dungeon', pattern: 'checker', lore: 'mapped by hand on the back of a maths test.' },
  'dawn:glock-18-citrus-peel': { finish: 'power-up', pattern: 'stars', lore: 'grab it and grow two sizes.' },
  'dawn:aug-signal-flare': { finish: 'fireball spam', pattern: 'flames', mod: 'muzzle', lore: 'down, forward, punch. again. again.' },
  'dawn:ssg-08-static-channel': { finish: 'crt scanline', pattern: 'stripes', mod: 'scope', lore: 'blow on the cartridge and try again.' },
  'dawn:p90-grape-soda': { finish: 'mana potion', pattern: 'dots', lore: 'tastes purple. restores 50 mp.' },
  'dawn:m4a1-blueprint-ink': { finish: 'level editor', pattern: 'circuit', lore: 'every block placed by hand.' },
  'dawn:m4a4-paper-lantern': { finish: 'save point', pattern: 'stars', mod: 'glow', lore: 'the music changes. you are safe here.' },
  'dawn:desert-eagle-copper-rain': { finish: 'combo breaker', pattern: 'bolts', lore: 'ten hits, then the screen shakes.' },
  'dawn:usp-violet-hour': { finish: 'final boss lobby', pattern: 'waves', mod: 'muzzle', lore: 'the long hallway before the big door.' },
  'dawn:ak-47-ember-grid': { finish: 'lava level', pattern: 'flames', mod: 'glow', lore: 'every series has one and everyone hates it.' },
  'dawn:awp-glacier-vein': { finish: 'ice physics', pattern: 'hex', mod: 'scope', lore: 'you will slide. you will fall. you will retry.' },
  'dawn:karambit-solar-flare': { finish: 'one more continue', pattern: 'flames', mod: 'gem', lore: '9… 8… 7… the coin is already in your hand.' },
  'dawn:butterfly-knife-deep-current': { finish: 'water temple', pattern: 'waves', mod: 'gem', lore: 'nobody leaves this level happy.' },
  'dawn:bayonet-old-gold': { finish: 'legendary loot', pattern: 'scales', mod: 'gem', lore: 'orange text. the beam was visible from space.' },

  // continue?
  'night:mac-10-wet-asphalt': { finish: 'street racer', pattern: 'stripes', lore: 'nitro at the last corner, always.' },
  'night:mp5-vending-glow': { finish: 'pixel café', pattern: 'pixels', lore: 'open 24 hours, 8 bits a cup.' },
  'night:p250-bus-ticket': { finish: 'fetch quest', pattern: 'checker', lore: 'bring me ten wolf pelts. then ten more.' },
  'night:galil-fire-escape': { finish: 'rooftop chase', pattern: 'bricks', lore: 'the guards never look up.' },
  'night:famas-laundromat': { finish: 'spin cycle', pattern: 'waves', lore: 'mash the stick to keep spinning.' },
  'night:ump-45-neon-dust': { finish: 'synth runner', pattern: 'circuit', lore: 'the soundtrack is doing the heavy lifting.' },
  'night:five-seven-payphone': { finish: 'dial-up lobby', pattern: 'dots', lore: 'waiting for players… waiting for players…' },
  'night:glock-18-taxi-stripe': { finish: 'crazy fare', pattern: 'checker', lore: 'hey hey, the meter is running.' },
  'night:aug-arcade-carpet': { finish: 'arcade carpet', pattern: 'splatter', lore: 'every arcade had this exact floor.' },
  'night:p90-subway-tile': { finish: 'endless runner', pattern: 'bricks', lore: 'there is no finish line. keep running.' },
  'night:ssg-08-radio-tower': { finish: 'sniper nest', pattern: 'stripes', mod: 'scope', lore: 'climb the tower, reveal the map.' },
  'night:m4a1-rain-check': { finish: 'rain level', pattern: 'dots', lore: 'the moody chapter with the sad piano.' },
  'night:m4a4-last-train': { finish: 'last checkpoint', pattern: 'stripes', mod: 'muzzle', lore: 'do not die now. do not die now.' },
  'night:desert-eagle-jukebox': { finish: 'rhythm combo', pattern: 'bolts', mod: 'glow', lore: 'perfect, perfect, perfect, miss.' },
  'night:usp-streetlight-halo': { finish: 'night mode', pattern: 'stars', mod: 'muzzle', lore: 'the day-night cycle finally turned.' },
  'night:ak-47-midnight-diner': { finish: 'cyber diner', pattern: 'circuit', mod: 'glow', lore: 'chrome booths, neon pie, hackers at table 4.' },
  'night:awp-skyline-static': { finish: 'glitch city', pattern: 'pixels', mod: 'scope', lore: 'walked through the wrong wall. now the map is soup.' },
  'night:bowie-knife-chrome-moon': { finish: 'moon level', pattern: 'dots', mod: 'gem', lore: 'low gravity, high jumps.' },
  'night:kukri-red-eye': { finish: 'rage quit', pattern: 'splatter', mod: 'gem', lore: 'the controller survived. barely.' },
  'night:stiletto-frozen-ink': { finish: 'any% run', pattern: 'bolts', mod: 'gem', lore: 'skip the cutscenes, clip the wall, frame-perfect.' },

  // bonus stage
  'prism:mp5-soap-film': { finish: 'bubble stage', pattern: 'dots', lore: 'trap them, pop them, collect the fruit.' },
  'prism:p250-disc-shine': { finish: 'memory card', pattern: 'circuit', lore: 'block 3 of 15. do not pull it out.' },
  'prism:mac-10-oil-slick': { finish: 'kart slick', pattern: 'splatter', lore: 'dropped behind you on the final lap.' },
  'prism:famas-lens-flare': { finish: 'cutscene flare', pattern: 'stars', lore: 'the camera swoops, the logo glints.' },
  'prism:galil-holo-tape': { finish: 'holo rare', pattern: 'hex', lore: 'pulled from the very last pack.' },
  'prism:glock-18-bubblegum-chrome': { finish: 'pink puff', pattern: 'dots', lore: 'inhales everything, copies the rest.' },
  'prism:p90-laser-lemon': { finish: 'laser tag', pattern: 'bolts', mod: 'glow', lore: 'pew. pew pew. you are out.' },
  'prism:aug-aurora-band': { finish: 'rainbow lap', pattern: 'stripes', lore: 'no guard rails. good luck.' },
  'prism:m4a1-pearl-coat': { finish: 'collector’s edition', pattern: 'scales', lore: 'still in the shrink wrap.' },
  'prism:m4a4-stained-window': { finish: 'cathedral boss', pattern: 'hex', mod: 'muzzle', lore: 'phase two starts when the organ kicks in.' },
  'prism:desert-eagle-opal-burst': { finish: 'critical hit', pattern: 'bolts', mod: 'glow', lore: 'big yellow numbers.' },
  'prism:usp-candy-glass': { finish: 'candy kingdom', pattern: 'checker', lore: 'match three to clear the board.' },
  'prism:ak-47-prism-break': { finish: 'prism break', pattern: 'stripes', mod: 'glow', lore: 'the light splits, the boss shield drops.' },
  'prism:awp-polar-glow': { finish: 'snow level', pattern: 'stars', mod: 'scope', lore: 'the penguins are not friendly.' },
  'prism:karambit-glass-rainbow': { finish: 'max combo', pattern: 'stripes', mod: 'gem', lore: 'the whole screen flashes white.' },
  'prism:butterfly-knife-pearl-storm': { finish: 'true ending', pattern: 'stars', mod: 'gem', lore: 'only if you found every secret.' },
  'prism:bayonet-sunset-chrome': { finish: 'credits roll', pattern: 'waves', mod: 'gem', lore: 'thank you for playing.' },
};
