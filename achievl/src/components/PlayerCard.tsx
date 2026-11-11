import React from 'react';
import { StyleSheet, View } from 'react-native';

import { RANK_TITLES } from '@/game/leveling';
import { useToday } from '@/hooks/useToday';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

import { RankBadge } from './badges';
import { Icon } from './Icon';
import { Bar } from './Meter';
import { Panel } from './Panel';
import { Txt } from './Txt';

function Figure({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={styles.figure}>
      <View style={styles.figureTop}>
        <Icon name={icon} size={15} color={color} />
        <Txt variant="number" size={17}>
          {value}
        </Txt>
      </View>
      <Txt variant="label" size={9.5} color="dim">
        {label}
      </Txt>
    </View>
  );
}

export type CardRef = React.ComponentRef<typeof View>;

/** The player's card: picture, name, rank, level progress and headline numbers. */
export function PlayerCard({ cardRef }: { cardRef?: React.Ref<CardRef> }) {
  const { id, colors, shape } = useTheme();
  const profile = useGame((s) => s.data.profile);
  const xp = useGame((s) => s.data.xp);
  const { level, rank, streak, done, quests } = useToday();
  // The handheld era only has four shades, so the picture gives up its colour there.
  const mono = id === 'pocket';

  return (
    // collapsable={false} keeps a real native view here so the card can be captured as an image.
    <View ref={cardRef} collapsable={false}>
      <Panel>
        <View style={styles.top}>
          <View style={[styles.avatar, { backgroundColor: mono ? colors.text : profile.color, borderRadius: shape.radius, borderColor: colors.panelBorder }]}>
            <Icon name={profile.avatar} size={38} color={mono ? colors.bg : '#FFFFFF'} />
          </View>
          <View style={styles.identity}>
            <Txt variant="title" numberOfLines={1} adjustsFontSizeToFit>
              {profile.name}
            </Txt>
            {profile.motto ? (
              <Txt variant="caption" color="dim" numberOfLines={2}>
                {profile.motto}
              </Txt>
            ) : null}
            <Txt variant="label" size={10.5} color="accent">
              {`Rank ${rank} · ${RANK_TITLES[rank]}`}
            </Txt>
          </View>
          <RankBadge rank={rank} />
        </View>

        <View style={styles.level}>
          <View style={styles.levelHead}>
            <Txt variant="heading" size={14}>{`Level ${level.level}`}</Txt>
            <Txt variant="caption" color="dim">{`${level.into} / ${level.needed} XP`}</Txt>
          </View>
          <Bar value={level.progress} color={colors.xp} height={12} />
        </View>

        <View style={[styles.figures, { borderTopColor: colors.insetBorder }]}>
          <Figure icon="star-four-points" value={xp.toLocaleString('en-US')} label="Score" color={colors.gold} />
          <Figure icon="fire" value={String(streak)} label="Day streak" color={colors.accentAlt} />
          <Figure icon="sword-cross" value={`${done}/${quests.length}`} label="Today" color={colors.accent} />
        </View>
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  identity: { flex: 1, gap: 2 },
  level: { marginTop: 14, gap: 6 },
  levelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  figures: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  figure: { flex: 1, alignItems: 'center', gap: 2 },
  figureTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
