import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Bar } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { canChangeAppIcon } from '@/services/appIcon';
import { useGame } from '@/store/useGame';
import { THEMES } from '@/theme/themes';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

/** One era, drawn in its own style so the list doubles as a preview. */
function EraCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  return (
    <ThemeProvider override={theme}>
      <EraCardBody selected={selected} onSelect={onSelect} />
    </ThemeProvider>
  );
}

function EraCardBody({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    // Each card sits on its own era's background, so it reads correctly whatever era is active.
    <LinearGradient colors={colors.bgGradient} style={[styles.stage, { borderColor: selected ? colors.accent : 'transparent' }]}>
      <Panel title={`${theme.name} · ${theme.year}`} icon={selected ? 'check-circle' : 'history'}>
        <View style={styles.card}>
          <Image source={theme.iconImage} style={[styles.icon, { borderColor: colors.panelBorder }]} accessibilityIgnoresInvertColors />
          <View style={styles.text}>
            <Txt variant="label" color="accent">
              {theme.era}
            </Txt>
            <Txt variant="caption" color="dim">
              {theme.blurb}
            </Txt>
            <View style={styles.sample}>
              <Bar value={0.7} color={colors.hp} height={10} />
              <Bar value={0.45} color={colors.water} height={10} />
            </View>
          </View>
        </View>
        <Btn
          label={selected ? 'Current era' : 'Use this era'}
          icon={selected ? 'check' : 'play'}
          variant={selected ? 'secondary' : 'primary'}
          disabled={selected}
          onPress={onSelect}
          style={styles.button}
          accessibilityLabel={selected ? `${theme.name} is the current era` : `Use ${theme.name}`}
        />
      </Panel>
    </LinearGradient>
  );
}

export default function Themes() {
  const themeId = useGame((s) => s.data.themeId);
  const matchIcon = useGame((s) => s.data.matchIcon);
  const setTheme = useGame((s) => s.setTheme);
  const iconNote = !canChangeAppIcon()
    ? 'The home-screen icon changes with the era in the installed iOS and Android apps.'
    : matchIcon
      ? 'Your home-screen icon changes to match the era you pick.'
      : 'The home-screen icon is set to stay put. Turn "App icon follows era" back on in settings.';

  return (
    <Screen title="Eras" subtitle="Same game, different generation" back>
      <Txt variant="caption" color="dim">
        {iconNote}
      </Txt>
      {THEMES.map((theme) => (
        <EraCard key={theme.id} theme={theme} selected={theme.id === themeId} onSelect={() => setTheme(theme.id)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { padding: 10, borderRadius: 18, borderWidth: 3, overflow: 'hidden' },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 16, borderWidth: 1 },
  text: { flex: 1, gap: 4 },
  sample: { gap: 5, marginTop: 4 },
  button: { marginTop: 14 },
});
