import React, { createContext, useContext, useMemo } from 'react';

import { useGame } from '@/store/useGame';

import { DEFAULT_THEME, themeById } from './themes';
import { Theme } from './types';

const ThemeContext = createContext<Theme>(DEFAULT_THEME);

/** Supplies the saved era, or a fixed one for previews. */
export function ThemeProvider({ children, override }: { children: React.ReactNode; override?: Theme }) {
  const themeId = useGame((s) => s.data.themeId);
  const theme = useMemo(() => override ?? themeById(themeId), [override, themeId]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
