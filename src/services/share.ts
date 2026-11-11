import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

/**
 * Hands text to the system share sheet, which reaches every social and messaging app
 * the player has installed. On the web it falls back to copying the text.
 */
export async function shareText(message: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    try {
      if (nav?.share) {
        await nav.share({ text: message });
        return 'shared';
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        return 'copied';
      }
    } catch {
      return 'dismissed';
    }
    return 'unavailable';
  }
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}

/** Captures a rendered view (the player card) and shares it as an image. Native only. */
export async function shareView(target: unknown, fallbackText: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') return shareText(fallbackText);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
    const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return shareText(fallbackText);
    const uri = await captureRef(target as Parameters<typeof captureRef>[0], { format: 'png', quality: 1 });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your player card' });
    return 'shared';
  } catch {
    return shareText(fallbackText);
  }
}
