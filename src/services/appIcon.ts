import { Platform } from 'react-native';

import { Theme } from '@/theme/types';

type IconModule = typeof import('expo-alternate-app-icons');

/** Loaded on demand: the module is native-only and absent from Expo Go. */
function load(): IconModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
    return require('expo-alternate-app-icons') as IconModule;
  } catch {
    return null;
  }
}

export function canChangeAppIcon(): boolean {
  return !!load()?.supportsAlternateIcons;
}

/**
 * Switches the home-screen icon to the era's. Does nothing when it already matches,
 * so iOS only shows its "icon changed" notice on a real change.
 */
export async function syncAppIcon(theme: Theme): Promise<boolean> {
  const icons = load();
  if (!icons?.supportsAlternateIcons) return false;
  try {
    if (icons.getAppIconName() === theme.appIcon) return true;
    await icons.setAlternateAppIcon(theme.appIcon);
    return true;
  } catch {
    return false;
  }
}
