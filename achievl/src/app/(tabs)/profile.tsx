import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Chip, Divider, Row } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { CardRef, PlayerCard } from '@/components/PlayerCard';
import { Screen } from '@/components/Screen';
import { StatRadar } from '@/components/StatRadar';
import { Txt } from '@/components/Txt';
import { nextRankAt, RANK_TITLES } from '@/game/leveling';
import { formatVolume } from '@/game/nutrition';
import { STAT_INFO, STAT_KEYS } from '@/game/types';
import { useToday } from '@/hooks/useToday';
import { shareView } from '@/services/share';
import { SOCIAL_NETWORKS, socialLines } from '@/services/socials';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

export default function Profile() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const data = useGame((s) => s.data);
  const recordShare = useGame((s) => s.recordShare);
  const { level, rank, streak } = useToday();
  const cardRef = useRef<CardRef>(null);

  const linked = SOCIAL_NETWORKS.filter((n) => data.socials[n.id]);
  const next = nextRankAt(level.level);

  const share = async () => {
    const lines = [
      `${data.profile.name} — Level ${level.level}, Rank ${rank} (${RANK_TITLES[rank]}) on Achievl`,
      `${data.xp.toLocaleString('en-US')} AP · ${streak} day streak`,
      ...socialLines(data.socials),
    ];
    const outcome = await shareView(cardRef.current, lines.join('\n'));
    if (outcome === 'shared' || outcome === 'copied') recordShare();
  };

  return (
    <Screen title="Player" subtitle={next ? `Rank ${next.rank} at level ${next.level}` : 'Top rank reached'}>
      <PlayerCard cardRef={cardRef} />
      <Btn label="Share player card" icon="share-variant" variant="secondary" onPress={share} />

      <Panel title="Stats" icon="chart-box">
        <StatRadar stats={data.stats} />
        <View style={styles.stats}>
          {STAT_KEYS.map((key, i) => (
            <View key={key}>
              {i > 0 && <Divider />}
              <View style={styles.stat}>
                <Icon name={STAT_INFO[key].icon} size={20} color={colors.accent} />
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{STAT_INFO[key].name}</Txt>
                  <Txt variant="caption" color="dim">
                    {STAT_INFO[key].blurb}
                  </Txt>
                </View>
                <Txt variant="number" size={18}>
                  {Math.floor(data.stats[key])}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      </Panel>

      <Panel title="Linked accounts" icon="account-multiple">
        <View style={styles.block}>
          {linked.length === 0 ? (
            <Txt color="dim">Add your handles so they appear on your card and in what you share.</Txt>
          ) : (
            <View style={styles.chips}>
              {linked.map((n) => (
                <Chip key={n.id} icon={n.icon} label={`${n.name}: ${data.socials[n.id]}`} color={colors.accent} />
              ))}
            </View>
          )}
          <Btn
            label={linked.length === 0 ? 'Link accounts' : 'Manage accounts'}
            icon="link-variant"
            variant="secondary"
            onPress={() => router.push('/socials')}
          />
        </View>
      </Panel>

      <Panel title="Era" icon="history">
        <View style={styles.era}>
          <Image source={theme.iconImage} style={[styles.eraIcon, { borderRadius: 12, borderColor: colors.panelBorder }]} accessibilityIgnoresInvertColors />
          <View style={styles.flex}>
            <Txt variant="heading">{theme.name}</Txt>
            <Txt variant="caption" color="dim">{`${theme.year} · ${theme.era}`}</Txt>
          </View>
          <Btn label="Change" size="sm" onPress={() => router.push('/themes')} accessibilityLabel="Change era" />
        </View>
      </Panel>

      <Panel title="Setup" icon="cog">
        <Row
          icon="target"
          title="Goals & settings"
          subtitle={`${data.goals.kcal} kcal · ${formatVolume(data.goals.waterMl, data.units)} water · ${data.goals.protein} g protein`}
          onPress={() => router.push('/settings')}
          right={<Icon name="chevron-right" size={24} color={colors.textDim} />}
        />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  block: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  era: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eraIcon: { width: 54, height: 54, borderWidth: 1 },
});
