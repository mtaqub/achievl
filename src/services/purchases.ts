/**
 * In-app purchases. No store is connected yet: the products in `arcade/premium.ts`
 * still have to be created in App Store Connect and Google Play, and a billing
 * library added to the build. Until then nothing can be bought, and this says so
 * rather than pretending.
 *
 * To connect a store: implement `buy` and `restore` with the billing library, set
 * `available` to true, and keep returning 'bought' only after the store confirms.
 */
export type PurchaseResult = 'bought' | 'cancelled' | 'unavailable';

export const purchases = {
  available: false as boolean,

  async buy(_productId: string): Promise<PurchaseResult> {
    return 'unavailable';
  },

  /** Product ids the player already owns (subscriptions), for a fresh install. */
  async restore(): Promise<string[]> {
    return [];
  },
};
