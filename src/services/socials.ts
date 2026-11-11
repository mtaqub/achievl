/** Networks a player can show on their card. Handles are stored without a leading "@". */
export interface SocialNetwork {
  id: string;
  name: string;
  icon: string;
  placeholder: string;
  /** Builds the public profile link, for networks that have one per handle. */
  url?: (handle: string) => string;
}

const enc = encodeURIComponent;

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { id: 'discord', name: 'Discord', icon: 'chat', placeholder: 'username' },
  { id: 'twitch', name: 'Twitch', icon: 'twitch', placeholder: 'channel', url: (h) => `https://www.twitch.tv/${enc(h)}` },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', placeholder: 'handle', url: (h) => `https://www.youtube.com/@${enc(h)}` },
  { id: 'x', name: 'X', icon: 'twitter', placeholder: 'handle', url: (h) => `https://x.com/${enc(h)}` },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', placeholder: 'username', url: (h) => `https://www.instagram.com/${enc(h)}` },
  { id: 'tiktok', name: 'TikTok', icon: 'music-note', placeholder: 'username', url: (h) => `https://www.tiktok.com/@${enc(h)}` },
  { id: 'threads', name: 'Threads', icon: 'at', placeholder: 'username', url: (h) => `https://www.threads.net/@${enc(h)}` },
  { id: 'bluesky', name: 'Bluesky', icon: 'butterfly', placeholder: 'name.bsky.social', url: (h) => `https://bsky.app/profile/${enc(h)}` },
  { id: 'reddit', name: 'Reddit', icon: 'reddit', placeholder: 'username', url: (h) => `https://www.reddit.com/user/${enc(h)}` },
  { id: 'snapchat', name: 'Snapchat', icon: 'snapchat', placeholder: 'username', url: (h) => `https://www.snapchat.com/add/${enc(h)}` },
  { id: 'steam', name: 'Steam', icon: 'steam', placeholder: 'custom URL name', url: (h) => `https://steamcommunity.com/id/${enc(h)}` },
  { id: 'xbox', name: 'Xbox gamertag', icon: 'microsoft-xbox', placeholder: 'gamertag' },
  { id: 'psn', name: 'PSN ID', icon: 'sony-playstation', placeholder: 'online ID' },
  { id: 'switch', name: 'Switch friend code', icon: 'nintendo-switch', placeholder: 'SW-0000-0000-0000' },
];

export function networkById(id: string): SocialNetwork | undefined {
  return SOCIAL_NETWORKS.find((n) => n.id === id);
}

/** One line per linked account, for the share text. */
export function socialLines(socials: Record<string, string>): string[] {
  return SOCIAL_NETWORKS.filter((n) => socials[n.id]).map((n) => `${n.name}: ${socials[n.id]}`);
}
