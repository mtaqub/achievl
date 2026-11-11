/**
 * Fallback for platforms without a Lock Screen surface (web). The iOS and Android
 * versions live next to this file and export the same functions.
 */
import { LiveProps } from '@/game/live';

export const liveSupported: boolean = false;

/** Shows the surface, or refreshes it if it is already up. Resolves false if the system refused. */
export async function showLive(_props: LiveProps): Promise<boolean> {
  return false;
}

export async function hideLive(): Promise<void> {}

/** Returns water added with the surface's own button since the app last checked, and clears it. */
export async function takePendingWater(): Promise<number> {
  return 0;
}

/** Calls back when the user presses a button on the surface while the app is running. */
export function onLiveInteraction(_handler: () => void): () => void {
  return () => {};
}

/** Whether the app may post the surface; asks the user when `prompt` is true. */
export async function ensureLivePermission(_prompt: boolean): Promise<boolean> {
  return false;
}
