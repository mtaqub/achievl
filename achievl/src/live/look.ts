import { LiveLook } from '@/game/live';
import { Theme, ThemeId } from '@/theme/types';

/**
 * The Lock Screen is drawn outside the app, where colours arrive as plain strings,
 * so every colour here is a solid hex value. Eras whose dim text is translucent in
 * the app get a flattened equivalent.
 */
const SOLID_DIM: Partial<Record<ThemeId, string>> = {
  wave: '#B6C6DE',
};

export function liveLook(theme: Theme): LiveLook {
  const { colors } = theme;
  return {
    bg: colors.bg,
    text: colors.text,
    dim: SOLID_DIM[theme.id] ?? colors.textDim,
    accent: colors.accent,
    hpColor: colors.hp,
    foodColor: colors.food,
    waterColor: colors.water,
    unlockHeadline: theme.toast.quest,
  };
}
