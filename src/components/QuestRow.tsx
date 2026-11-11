import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Quest, STAT_INFO } from '@/game/types';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

import { IconTile } from './controls';
import { confirm } from './Dialog';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** One quest on today's board. Tap to clear it; tap a cleared quest to take it back. */
export function QuestRow({ quest, done, onEdit }: { quest: Quest; done: boolean; onEdit?: () => void }) {
  const { colors, shape } = useTheme();
  const completeQuest = useGame((s) => s.completeQuest);
  const uncompleteQuest = useGame((s) => s.uncompleteQuest);

  const toggle = () => {
    if (!done) return completeQuest(quest.id);
    confirm({
      title: 'Undo this quest?',
      message: `"${quest.title}" goes back on the board and its ${quest.points} AP is returned.`,
      confirmLabel: 'Undo',
      onConfirm: () => uncompleteQuest(quest.id),
    });
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${quest.title}, ${quest.points} points`}
        onPress={toggle}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>
        <IconTile icon={quest.icon} color={done ? colors.textDim : colors.accent} dim={done} />
        <View style={styles.text}>
          <Txt variant="bodyStrong" color={done ? 'dim' : 'text'} numberOfLines={2} style={done && styles.struck}>
            {quest.title}
          </Txt>
          <Txt variant="caption" color="dim" numberOfLines={1}>
            {`${quest.points} AP · ${STAT_INFO[quest.stat].name}`}
          </Txt>
        </View>
        <View
          style={[
            styles.check,
            {
              borderRadius: shape.radius === 0 ? 0 : 14,
              borderColor: done ? colors.accent : colors.insetBorder,
              backgroundColor: done ? colors.accent : colors.inset,
            },
          ]}>
          {done && <Icon name="check-bold" size={18} color={colors.accentText} />}
        </View>
      </Pressable>
      {onEdit && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${quest.title}`} onPress={onEdit} hitSlop={10} style={styles.edit}>
          <Icon name="dots-vertical" size={22} color={colors.textDim} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  text: { flex: 1, gap: 2 },
  struck: { textDecorationLine: 'line-through' },
  check: { width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  edit: { paddingLeft: 8, paddingVertical: 8 },
});
