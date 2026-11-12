/**
 * Persistence for the root state: works with any async key-value store (React Native
 * AsyncStorage, an MMKV wrapper, or an in-memory map in tests). Saves are debounced, loads
 * are guarded (a corrupt or unreadable blob is kept aside and a fresh state is used), and
 * older schema versions are migrated step by step.
 */
import { AchievlRootState, SCHEMA_VERSION } from './types';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Upgrades a saved blob from version `from` to `from + 1`. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade from. Version 1 is the first schema, so none
 * exist yet; when the shape changes, bump SCHEMA_VERSION and add `[1]: (raw) => ({ ...raw, ... })`.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type HydrateStatus = 'loaded' | 'empty' | 'migrated' | 'recovered';

export interface HydrateResult {
  readonly state: AchievlRootState;
  readonly status: HydrateStatus;
  readonly error?: string;
}

export interface PersistenceOptions {
  readonly key?: string;
  readonly debounceMs?: number;
  readonly migrations?: Readonly<Record<number, Migration>>;
  /** Injected timers so tests can drive the debounce. */
  readonly setTimer?: (fn: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
}

/** A light shape check: enough to reject garbage without re-describing every field. */
export function looksLikeRootState(value: unknown): value is AchievlRootState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const session = v.session as Record<string, unknown> | undefined;
  const meta = v.meta as Record<string, unknown> | undefined;
  return (
    typeof v.schemaVersion === 'number' &&
    typeof v.lastActiveTimestamp === 'number' &&
    !!session &&
    typeof session.dayStart === 'number' &&
    Array.isArray(session.completed) &&
    !!meta &&
    typeof meta.gold === 'number' &&
    Array.isArray(meta.unlockedEras) &&
    !!v.inventory &&
    typeof v.inventory === 'object' &&
    !!v.pity &&
    !!v.uiQueue
  );
}

export class PersistenceAdapter {
  private readonly key: string;
  private readonly debounceMs: number;
  private readonly migrations: Readonly<Record<number, Migration>>;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private pending: AchievlRootState | null = null;
  private timer: unknown = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    options: PersistenceOptions = {}
  ) {
    this.key = options.key ?? 'achievl/core-v1';
    this.debounceMs = options.debounceMs ?? 500;
    this.migrations = options.migrations ?? MIGRATIONS;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** Loads the saved state, migrating or recovering as needed; never throws. */
  async hydrate(fresh: () => AchievlRootState): Promise<HydrateResult> {
    let text: string | null;
    try {
      text = await this.storage.getItem(this.key);
    } catch (e) {
      return { state: fresh(), status: 'recovered', error: `read failed: ${String(e)}` };
    }
    if (text === null) return { state: fresh(), status: 'empty' };
    try {
      let raw = JSON.parse(text) as Record<string, unknown>;
      let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
      if (version > SCHEMA_VERSION) throw new Error(`saved by a newer app (schema ${version})`);
      const migrated = version < SCHEMA_VERSION;
      while (version < SCHEMA_VERSION) {
        const step = this.migrations[version];
        if (!step) throw new Error(`no migration from schema ${version}`);
        raw = { ...step(raw), schemaVersion: version + 1 };
        version++;
      }
      if (!looksLikeRootState(raw)) throw new Error('saved state has the wrong shape');
      return { state: raw, status: migrated ? 'migrated' : 'loaded' };
    } catch (e) {
      // Keep the unreadable blob for support, then start clean rather than crash.
      await this.storage.setItem(`${this.key}.corrupt`, text).catch(() => undefined);
      return { state: fresh(), status: 'recovered', error: String(e) };
    }
  }

  /** Saves after `debounceMs` of quiet; only the latest state is written. */
  scheduleSave(state: AchievlRootState): void {
    this.pending = state;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  /** Writes any pending state now (call when the app goes to the background). */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    const state = this.pending;
    this.pending = null;
    if (!state) return this.writing;
    this.writing = this.writing.then(() => this.storage.setItem(this.key, JSON.stringify(state))).catch(() => undefined);
    return this.writing;
  }

  async clear(): Promise<void> {
    this.pending = null;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    await this.storage.removeItem(this.key);
  }
}

/** An in-memory store for tests and previews. */
export function memoryStorage(seed: Record<string, string> = {}): KeyValueStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
}
