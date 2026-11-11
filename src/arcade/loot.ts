import { LootItem, LootKind } from './types';

export const LOOT: LootItem[] = [
  { id: 'title:early-riser', kind: 'title', name: 'early riser', rarity: 'common' },
  { id: 'title:snack-scout', kind: 'title', name: 'snack scout', rarity: 'common' },
  { id: 'title:water-bearer', kind: 'title', name: 'water bearer', rarity: 'common' },
  { id: 'title:list-maker', kind: 'title', name: 'list maker', rarity: 'common' },
  { id: 'title:bed-maker', kind: 'title', name: 'bed maker', rarity: 'common' },
  { id: 'title:page-turner', kind: 'title', name: 'page turner', rarity: 'common' },
  { id: 'title:streak-keeper', kind: 'title', name: 'streak keeper', rarity: 'rare' },
  { id: 'title:quest-hound', kind: 'title', name: 'quest hound', rarity: 'rare' },
  { id: 'title:iron-stomach', kind: 'title', name: 'iron stomach', rarity: 'rare' },
  { id: 'title:calm-mind', kind: 'title', name: 'calm mind', rarity: 'rare' },
  { id: 'title:boss-of-mondays', kind: 'title', name: 'boss of mondays', rarity: 'epic' },
  { id: 'title:hydration-station', kind: 'title', name: 'hydration station', rarity: 'epic' },
  { id: 'title:final-form', kind: 'title', name: 'final form', rarity: 'legendary' },
  { id: 'title:main-character', kind: 'title', name: 'main character', rarity: 'legendary' },
  { id: 'emblem:shield', kind: 'emblem', name: 'shield', rarity: 'common', icon: 'shield', paint: ['#8C9AA8', '#4A5562'] },
  { id: 'emblem:flame', kind: 'emblem', name: 'flame', rarity: 'common', icon: 'fire', paint: ['#FF9D2E', '#B3261E'] },
  { id: 'emblem:bolt', kind: 'emblem', name: 'bolt', rarity: 'common', icon: 'lightning-bolt', paint: ['#FFE04B', '#F08A1C'] },
  { id: 'emblem:leaf', kind: 'emblem', name: 'leaf', rarity: 'common', icon: 'leaf', paint: ['#8EE35A', '#2A8F18'] },
  { id: 'emblem:crown', kind: 'emblem', name: 'crown', rarity: 'rare', icon: 'crown', paint: ['#FFD45C', '#A6751C'] },
  { id: 'emblem:anchor', kind: 'emblem', name: 'anchor', rarity: 'rare', icon: 'anchor', paint: ['#6FA8DC', '#1F3A5F'] },
  { id: 'emblem:summit', kind: 'emblem', name: 'summit', rarity: 'rare', icon: 'image-filter-hdr', paint: ['#B8C8FF', '#3A3F8F'] },
  { id: 'emblem:firebird', kind: 'emblem', name: 'firebird', rarity: 'epic', icon: 'bird', paint: ['#FF6B3D', '#7A0E1A'] },
  { id: 'emblem:comet', kind: 'emblem', name: 'comet', rarity: 'epic', icon: 'star-shooting', paint: ['#B388FF', '#22D3EE'] },
  { id: 'emblem:diamond-heart', kind: 'emblem', name: 'diamond heart', rarity: 'legendary', icon: 'diamond-stone', paint: ['#BFF3FF', '#F2B01E'] },
  { id: 'banner:morning-fog', kind: 'banner', name: 'morning fog', rarity: 'common', paint: ['#D9E2EA', '#9AA8B5'] },
  { id: 'banner:grass-stain', kind: 'banner', name: 'grass stain', rarity: 'common', paint: ['#8EE35A', '#3DAA1E'] },
  { id: 'banner:brick-red', kind: 'banner', name: 'brick red', rarity: 'common', paint: ['#C8553D', '#7A2E1E'] },
  { id: 'banner:plain-denim', kind: 'banner', name: 'plain denim', rarity: 'common', paint: ['#5C7FB8', '#2B3F66'] },
  { id: 'banner:sunset-strip', kind: 'banner', name: 'sunset strip', rarity: 'rare', paint: ['#FFB36B', '#E0457B'] },
  { id: 'banner:deep-sea', kind: 'banner', name: 'deep sea', rarity: 'rare', paint: ['#22D3C5', '#0E2F6B'] },
  { id: 'banner:mint-chip', kind: 'banner', name: 'mint chip', rarity: 'rare', paint: ['#B8FFE0', '#3F8F6B'] },
  { id: 'banner:neon-alley', kind: 'banner', name: 'neon alley', rarity: 'epic', paint: ['#FF3DA5', '#3A1E8C'] },
  { id: 'banner:aurora', kind: 'banner', name: 'aurora', rarity: 'epic', paint: ['#5CFFB8', '#7A4BFF'] },
  { id: 'banner:solid-gold', kind: 'banner', name: 'solid gold', rarity: 'legendary', paint: ['#FFE9A8', '#C98A12'] },
  { id: 'sticker:thumbs-up', kind: 'sticker', name: 'thumbs up', rarity: 'common', icon: 'thumb-up' },
  { id: 'sticker:coffee', kind: 'sticker', name: 'coffee', rarity: 'common', icon: 'coffee' },
  { id: 'sticker:pizza', kind: 'sticker', name: 'pizza', rarity: 'common', icon: 'pizza' },
  { id: 'sticker:nap-time', kind: 'sticker', name: 'nap time', rarity: 'common', icon: 'sleep' },
  { id: 'sticker:lift-off', kind: 'sticker', name: 'lift off', rarity: 'rare', icon: 'rocket-launch' },
  { id: 'sticker:boo', kind: 'sticker', name: 'boo', rarity: 'rare', icon: 'ghost' },
  { id: 'sticker:happy-bot', kind: 'sticker', name: 'happy bot', rarity: 'rare', icon: 'robot-happy' },
  { id: 'sticker:visitor', kind: 'sticker', name: 'visitor', rarity: 'epic', icon: 'ufo' },
  { id: 'sticker:party', kind: 'sticker', name: 'party', rarity: 'epic', icon: 'party-popper' },
  { id: 'sticker:champion', kind: 'sticker', name: 'champion', rarity: 'legendary', icon: 'trophy-award' },
];

const BY_ID = new Map(LOOT.map((item) => [item.id, item] as const));

export function lootById(id: string): LootItem | undefined {
  return BY_ID.get(id);
}

export const KIND_INFO: Record<LootKind, { label: string; plural: string; icon: string; blurb: string }> = {
  title: { label: 'title', plural: 'titles', icon: 'format-quote-close', blurb: 'short lines you can wear as your motto.' },
  emblem: { label: 'emblem', plural: 'emblems', icon: 'shield-star', blurb: 'crests for your player card.' },
  banner: { label: 'banner', plural: 'banners', icon: 'flag-variant', blurb: 'colour washes for your card.' },
  sticker: { label: 'sticker', plural: 'stickers', icon: 'sticker-emoji', blurb: 'small pictures to collect.' },
};
