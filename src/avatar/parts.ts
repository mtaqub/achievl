/**
 * The avatar maker's parts. Everything not marked `capsule` is free from the start;
 * capsule parts come out of the arcade's capsule machine.
 */

export type Slot =
  | 'skin'
  | 'face'
  | 'hair'
  | 'hairColor'
  | 'eyes'
  | 'eyeColor'
  | 'brows'
  | 'nose'
  | 'mouth'
  | 'beard'
  | 'glasses'
  | 'hat'
  | 'top'
  | 'topColor'
  | 'bg'
  | 'outfit';

export type CapsuleRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Part {
  id: string;
  name: string;
  /** Colour slots store the colour itself. */
  color?: string;
  /** Only from the capsule machine. */
  capsule?: CapsuleRarity;
  /** Outfits: the parts they put on. */
  preset?: Partial<Record<Slot, string>>;
}

export type AvatarLook = Record<Slot, string>;

const colours = (list: [string, string][]): Part[] => list.map(([name, color]) => ({ id: color, name, color }));

export const PARTS: Record<Slot, Part[]> = {
  skin: colours([
    ['porcelain', '#FBE3D2'],
    ['peach', '#F5CBA7'],
    ['sand', '#E8B98F'],
    ['honey', '#D49A6A'],
    ['amber', '#B97A4A'],
    ['bronze', '#8F5A36'],
    ['umber', '#6B4026'],
    ['ebony', '#45291A'],
  ]),
  face: [
    { id: 'round', name: 'round' },
    { id: 'oval', name: 'oval' },
    { id: 'square', name: 'square' },
    { id: 'heart', name: 'heart' },
    { id: 'long', name: 'long' },
  ],
  hair: [
    { id: 'bald', name: 'bald' },
    { id: 'buzz', name: 'buzz' },
    { id: 'short', name: 'short' },
    { id: 'swoop', name: 'swoop' },
    { id: 'spiky', name: 'spiky' },
    { id: 'bob', name: 'bob' },
    { id: 'long', name: 'long' },
    { id: 'bun', name: 'bun' },
    { id: 'curly', name: 'curly' },
    { id: 'mohawk', name: 'mohawk' },
    { id: 'twintails', name: 'twin-tails' },
    { id: 'hime', name: 'hime cut' },
  ],
  hairColor: colours([
    ['jet', '#1C1A1A'],
    ['espresso', '#3B2418'],
    ['chestnut', '#6E3B1F'],
    ['copper', '#A84D22'],
    ['honey', '#C99A4B'],
    ['platinum', '#EDE3C8'],
    ['silver', '#A7A9AC'],
    ['bubblegum', '#FF8CC6'],
    ['electric', '#3D7BFF'],
    ['mint', '#5CE0B0'],
  ]),
  eyes: [
    { id: 'dot', name: 'dot' },
    { id: 'round', name: 'round' },
    { id: 'happy', name: 'happy' },
    { id: 'sleepy', name: 'sleepy' },
    { id: 'wink', name: 'wink' },
    { id: 'sharp', name: 'sharp' },
    { id: 'anime', name: 'anime' },
  ],
  eyeColor: colours([
    ['brown', '#4A2E1D'],
    ['hazel', '#7A5A2E'],
    ['green', '#3E7A4A'],
    ['blue', '#3A6EA5'],
    ['grey', '#6B7480'],
    ['violet', '#7A4AA5'],
  ]),
  brows: [
    { id: 'flat', name: 'flat' },
    { id: 'arched', name: 'arched' },
    { id: 'thick', name: 'thick' },
    { id: 'angry', name: 'angry' },
    { id: 'none', name: 'none' },
  ],
  nose: [
    { id: 'dot', name: 'dot' },
    { id: 'button', name: 'button' },
    { id: 'long', name: 'long' },
    { id: 'wide', name: 'wide' },
  ],
  mouth: [
    { id: 'smile', name: 'smile' },
    { id: 'grin', name: 'grin' },
    { id: 'flat', name: 'flat' },
    { id: 'open', name: 'open' },
    { id: 'smirk', name: 'smirk' },
    { id: 'tongue', name: 'tongue' },
  ],
  beard: [
    { id: 'none', name: 'none' },
    { id: 'stubble', name: 'stubble' },
    { id: 'moustache', name: 'moustache' },
    { id: 'goatee', name: 'goatee' },
    { id: 'full', name: 'full' },
  ],
  glasses: [
    { id: 'none', name: 'none' },
    { id: 'round', name: 'round frames' },
    { id: 'square', name: 'square frames' },
    { id: 'ballistic', name: 'ballistic glasses' },
    { id: 'goggles', name: 'goggles', capsule: 'common' },
    { id: 'eyepatch', name: 'eyepatch', capsule: 'rare' },
    { id: 'shades', name: 'shades', capsule: 'common' },
    { id: 'monocle', name: 'monocle', capsule: 'rare' },
    { id: 'visor', name: 'cyber visor', capsule: 'epic' },
    { id: 'starry', name: 'star shades', capsule: 'rare' },
    { id: 'retro3d', name: 'red-blue specs', capsule: 'common' },
  ],
  hat: [
    { id: 'none', name: 'none' },
    { id: 'cap', name: 'cap' },
    { id: 'beanie', name: 'beanie' },
    { id: 'helmet', name: 'combat helmet' },
    { id: 'beret', name: 'beret' },
    { id: 'balaclava', name: 'balaclava' },
    { id: 'boonie', name: 'boonie hat' },
    { id: 'nvg', name: 'night vision', capsule: 'epic' },
    { id: 'racehelm', name: 'race helmet', capsule: 'rare' },
    { id: 'tricorn', name: 'captain hat', capsule: 'rare' },
    { id: 'headphones', name: 'headphones', capsule: 'common' },
    { id: 'party', name: 'party hat', capsule: 'common' },
    { id: 'cat', name: 'cat ears', capsule: 'rare' },
    { id: 'propeller', name: 'propeller cap', capsule: 'rare' },
    { id: 'tophat', name: 'top hat', capsule: 'rare' },
    { id: 'horns', name: 'horned helm', capsule: 'epic' },
    { id: 'wizard', name: 'wizard hat', capsule: 'epic' },
    { id: 'crown', name: 'crown', capsule: 'legendary' },
    { id: 'halo', name: 'halo', capsule: 'legendary' },
  ],
  top: [
    { id: 'tee', name: 'tee' },
    { id: 'hoodie', name: 'hoodie' },
    { id: 'collar', name: 'collar shirt' },
    { id: 'vest', name: 'tactical vest' },
    { id: 'sailor', name: 'sailor uniform' },
    { id: 'bomber', name: 'sticker bomber', capsule: 'rare' },
    { id: 'camo', name: 'camo jacket' },
    { id: 'plate', name: 'plate carrier', capsule: 'rare' },
    { id: 'gi', name: 'shadow gi', capsule: 'rare' },
    { id: 'ghillie', name: 'ghillie suit', capsule: 'epic' },
    { id: 'robe', name: 'mage robe', capsule: 'epic' },
    { id: 'jersey', name: 'team jersey', capsule: 'common' },
    { id: 'varsity', name: 'varsity jacket', capsule: 'rare' },
    { id: 'tux', name: 'tuxedo', capsule: 'epic' },
    { id: 'armor', name: 'knight armour', capsule: 'epic' },
    { id: 'space', name: 'space suit', capsule: 'legendary' },
  ],
  topColor: colours([
    ['olive', '#5B6342'],
    ['tan', '#B49A6A'],
    ['coyote', '#8A6E4B'],
    ['urban', '#6B7076'],
    ['red', '#D9483B'],
    ['orange', '#F08A1C'],
    ['yellow', '#F2C230'],
    ['green', '#3FA35B'],
    ['teal', '#22A5A0'],
    ['blue', '#3A6ED9'],
    ['purple', '#8352D6'],
    ['pink', '#E05AA8'],
    ['black', '#2A2C30'],
    ['white', '#ECEEF0'],
  ]),
  bg: [
    { id: 'sky', name: 'sky', color: '#9BD3F5' },
    { id: 'mint', name: 'mint', color: '#A8E6CF' },
    { id: 'peach', name: 'peach', color: '#FFD3B6' },
    { id: 'lilac', name: 'lilac', color: '#D7C4F2' },
    { id: 'slate', name: 'slate', color: '#4A5260' },
    { id: 'sunset', name: 'sunset', color: '#FF9A5C', capsule: 'common' },
    { id: 'grid', name: 'neon grid', color: '#1A1040', capsule: 'rare' },
    { id: 'bubbles', name: 'bubbles', color: '#5CC8FF', capsule: 'rare' },
    { id: 'galaxy', name: 'galaxy', color: '#140A2E', capsule: 'legendary' },
  ],
  outfit: [
    { id: 'none', name: 'your own' },
    { id: 'operator', name: 'operator', preset: { hat: 'helmet', glasses: 'ballistic', top: 'vest', topColor: '#5B6342' } },
    { id: 'recon', name: 'recon', preset: { hat: 'boonie', glasses: 'none', top: 'camo', topColor: '#8A6E4B' } },
    { id: 'racer', name: 'street racer', capsule: 'common', preset: { hat: 'racehelm', glasses: 'none', top: 'jersey', topColor: '#D9483B' } },
    { id: 'specops', name: 'night ops', capsule: 'rare', preset: { hat: 'nvg', glasses: 'none', top: 'plate', topColor: '#6B7076' } },
    { id: 'ninja', name: 'shadow ninja', capsule: 'rare', preset: { hat: 'balaclava', glasses: 'none', top: 'gi', topColor: '#D9483B' } },
    { id: 'captain', name: 'sea captain', capsule: 'rare', preset: { hat: 'tricorn', glasses: 'eyepatch', top: 'collar', topColor: '#2A2C30' } },
    { id: 'sniper', name: 'ghillie sniper', capsule: 'epic', preset: { hat: 'boonie', glasses: 'none', top: 'ghillie', topColor: '#5B6342' } },
    { id: 'knight', name: 'dungeon knight', capsule: 'epic', preset: { hat: 'horns', glasses: 'none', top: 'armor', topColor: '#D9483B' } },
    { id: 'mage', name: 'arch mage', capsule: 'epic', preset: { hat: 'wizard', glasses: 'none', top: 'robe', topColor: '#8352D6' } },
    {
      id: 'afterschool',
      name: 'after-school hunter',
      preset: {
        hair: 'hime',
        hairColor: '#1C1A1A',
        eyes: 'anime',
        brows: 'arched',
        nose: 'dot',
        mouth: 'flat',
        beard: 'none',
        glasses: 'none',
        hat: 'none',
        top: 'sailor',
        topColor: '#3A6ED9',
      },
    },
    {
      id: 'neko',
      name: 'arcade neko',
      capsule: 'rare',
      preset: {
        hair: 'bob',
        hairColor: '#EDE3C8',
        eyes: 'anime',
        brows: 'arched',
        nose: 'dot',
        mouth: 'smile',
        beard: 'none',
        glasses: 'none',
        hat: 'cat',
        top: 'hoodie',
        topColor: '#E05AA8',
      },
    },
    {
      id: 'shrine',
      name: 'shrine guard',
      capsule: 'epic',
      preset: {
        hair: 'hime',
        hairColor: '#1C1A1A',
        eyes: 'anime',
        brows: 'flat',
        nose: 'dot',
        mouth: 'flat',
        beard: 'none',
        glasses: 'none',
        hat: 'none',
        top: 'gi',
        topColor: '#D9483B',
      },
    },
    {
      id: 'idol',
      name: 'midnight idol',
      capsule: 'legendary',
      preset: {
        hair: 'twintails',
        hairColor: '#FF8CC6',
        eyes: 'anime',
        brows: 'arched',
        nose: 'dot',
        mouth: 'smile',
        beard: 'none',
        glasses: 'none',
        hat: 'headphones',
        top: 'bomber',
        topColor: '#FF8CC6',
      },
    },
    { id: 'ranger', name: 'star ranger', capsule: 'legendary', preset: { hat: 'none', glasses: 'visor', top: 'space', topColor: '#3A6ED9' } },
  ],
};

export const SLOT_LABEL: Record<Slot, string> = {
  outfit: 'outfit',
  skin: 'skin',
  face: 'face',
  hair: 'hair',
  hairColor: 'hair colour',
  eyes: 'eyes',
  eyeColor: 'eye colour',
  brows: 'brows',
  nose: 'nose',
  mouth: 'mouth',
  beard: 'facial hair',
  glasses: 'glasses',
  hat: 'hat',
  top: 'top',
  topColor: 'top colour',
  bg: 'background',
};

export const SLOTS = Object.keys(SLOT_LABEL) as Slot[];

/** Capsule parts have ids prefixed with their slot so they are unique across slots. */
export const capsuleKey = (slot: Slot, id: string) => `${slot}:${id}`;

export const CAPSULE_PARTS: { key: string; slot: Slot; part: Part & { capsule: CapsuleRarity } }[] = SLOTS.flatMap((slot) =>
  PARTS[slot].filter((p): p is Part & { capsule: CapsuleRarity } => !!p.capsule).map((part) => ({ key: capsuleKey(slot, part.id), slot, part }))
);

export function capsulePart(key: string) {
  return CAPSULE_PARTS.find((c) => c.key === key);
}

export function partOf(slot: Slot, id: string): Part {
  return PARTS[slot].find((p) => p.id === id) ?? PARTS[slot][0];
}

export const DEFAULT_LOOK: AvatarLook = {
  skin: '#E8B98F',
  face: 'round',
  hair: 'short',
  hairColor: '#3B2418',
  eyes: 'round',
  eyeColor: '#4A2E1D',
  brows: 'flat',
  nose: 'button',
  mouth: 'flat',
  beard: 'stubble',
  glasses: 'ballistic',
  hat: 'helmet',
  top: 'vest',
  topColor: '#5B6342',
  bg: 'slate',
  outfit: 'none',
};

/** Whether a part can be worn: free parts always, capsule parts once pulled. */
export function canWear(slot: Slot, part: Part, owned: Record<string, number>): boolean {
  return !part.capsule || !!owned[capsuleKey(slot, part.id)];
}

/** A random look from the parts this player can wear. */
export function randomLook(owned: Record<string, number>, rng: () => number = Math.random): AvatarLook {
  const look = { ...DEFAULT_LOOK };
  for (const slot of SLOTS) {
    if (slot === 'outfit') continue;
    const options = PARTS[slot].filter((p) => canWear(slot, p, owned));
    look[slot] = options[Math.floor(rng() * options.length)].id;
  }
  return look;
}
