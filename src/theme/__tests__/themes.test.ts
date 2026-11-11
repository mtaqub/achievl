import fs from 'fs';
import path from 'path';

import { ERA_COUNT } from '@/game/milestones';
import { liveLook } from '@/live/look';

import { DEFAULT_THEME, F, themeById, THEMES } from '../themes';

const appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../app.json'), 'utf8'));
const iconPlugin = appConfig.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-alternate-app-icons');
const registeredIcons: { name: string; ios: string; android: { foregroundImage: string } }[] = iconPlugin[1];

describe('eras', () => {
  it('have unique ids and the count the milestone expects', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES).toHaveLength(ERA_COUNT);
  });

  it('fall back to the default era for an unknown id', () => {
    expect(themeById('nope')).toBe(DEFAULT_THEME);
    expect(themeById('wave').name).toBe('Ribbon Wave');
  });

  it('only use fonts that are loaded', () => {
    const loaded = new Set<string | undefined>([...Object.values(F), undefined]);
    for (const theme of THEMES) {
      for (const spec of [theme.fonts.display, theme.fonts.body, theme.fonts.number]) {
        if (!spec) continue;
        expect(loaded.has(spec.regular)).toBe(true);
        expect(loaded.has(spec.strong)).toBe(true);
      }
    }
  });

  it('each have an app icon registered in app.json, with files on disk', () => {
    const byName = new Map(registeredIcons.map((icon) => [icon.name, icon]));
    for (const theme of THEMES) {
      if (theme.appIcon === null) continue; // the default icon
      const icon = byName.get(theme.appIcon);
      expect(icon).toBeDefined();
      expect(icon!.ios).toBe(`./assets/icons/${theme.id}.png`);
      for (const file of [icon!.ios, icon!.android.foregroundImage]) {
        expect(fs.existsSync(path.join(__dirname, '../../..', file))).toBe(true);
      }
    }
    // Exactly one era uses the default icon, and nothing is registered that no era uses.
    expect(THEMES.filter((t) => t.appIcon === null)).toHaveLength(1);
    expect(registeredIcons).toHaveLength(THEMES.length - 1);
  });

  it('hand the Lock Screen solid hex colours only', () => {
    for (const theme of THEMES) {
      const { unlockHeadline, ...colors } = liveLook(theme);
      expect(unlockHeadline.length).toBeGreaterThan(0);
      for (const [key, value] of Object.entries(colors)) {
        expect(`${theme.id}.${key} ${value}`).toMatch(/ #[0-9a-fA-F]{6}$/);
      }
    }
  });
});
