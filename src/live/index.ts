import type * as SurfaceModule from './surface';

/**
 * The surface for this platform, loaded defensively: in a build that lacks the native
 * widget module (Expo Go, for instance) the app simply runs without it.
 */
let surface: typeof SurfaceModule | null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
  surface = require('./surface') as typeof SurfaceModule;
} catch {
  surface = null;
}

export const live = {
  supported: !!surface?.liveSupported,
  show: surface?.showLive ?? (async () => false),
  hide: surface?.hideLive ?? (async () => {}),
  takePendingWater: surface?.takePendingWater ?? (async () => 0),
  onInteraction: surface?.onLiveInteraction ?? (() => () => {}),
  ensurePermission: surface?.ensureLivePermission ?? (async () => false),
};
