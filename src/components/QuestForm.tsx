import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_INFO, CATEGORY_ORDER, POINT_VALUES, QUEST_ICONS } from '@/data/questCatalog';
import { QuestInput } from '@/game/engine';
import { QuestRepeat, QuestSlot, STAT_INFO, STAT_KEYS, StatKey } from '@/game/types';
import { useTheme } from '@/theme/ThemeProvider';

import { Btn } from './Btn';
import { Field, Segmented } from './controls';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { Txt } from './Txt';

const SLOT_OPTIONS: { value: QuestSlot; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];
const REPEAT_OPTIONS: { value: QuestRepeat; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'once', label: 'Just once' },
];

export const BLANK_QUEST: QuestInput = {
  title: '',
  description: '',
  icon: QUEST_ICONS[0],
  points: 10,
  stat: 'WIL',
  category: 'home',
  slot: 'anytime',
  repeat: 'daily',
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Txt variant="label" color="dim">
        {label}
      </Txt>
      {children}
    </View>
  );
}

/** Editor for a quest, used for both new custom quests and changes to existing ones. */
export function QuestForm({ initial, submitLabel, onSubmit }: { initial: QuestInput; submitLabel: string; onSubmit: (quest: QuestInput) => void }) {
  const { colors, shape } = useTheme();
  const [quest, setQuest] = useState<QuestInput>(initial);
  const set = <K extends keyof QuestInput>(key: K, value: QuestInput[K]) => setQuest((q) => ({ ...q, [key]: value }));
  const valid = quest.title.trim().length > 0;

  return (
    <Panel>
      <View style={styles.form}>
        <Field
          label="Quest name"
          value={quest.title}
          onChangeText={(v) => set('title', v)}
          placeholder="e.g. Practice guitar"
          maxLength={40}
          returnKeyType="done"
        />
        <Field
          label="Details (optional)"
          value={quest.description ?? ''}
          onChangeText={(v) => set('description', v)}
          placeholder="What counts as done?"
          maxLength={90}
          returnKeyType="done"
        />

        <Group label="Icon">
          <View style={styles.icons}>
            {QUEST_ICONS.map((icon) => {
              const on = quest.icon === icon;
              return (
                <Pressable
                  key={icon}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={icon.replace(/-/g, ' ')}
                  onPress={() => set('icon', icon)}
                  style={[
                    styles.iconBtn,
                    { borderRadius: shape.radius, borderColor: on ? colors.accent : colors.insetBorder, backgroundColor: on ? colors.accent : colors.inset },
                  ]}>
                  <Icon name={icon} size={22} color={on ? colors.accentText : colors.textDim} />
                </Pressable>
              );
            })}
          </View>
        </Group>

        <Group label="Points">
          <Segmented
            wrap
            value={String(quest.points)}
            onChange={(v) => set('points', Number(v))}
            options={POINT_VALUES.map((p) => ({ value: String(p), label: String(p) }))}
          />
          <Txt variant="caption" color="dim">
            Harder quests are worth more. Every 5 points adds 1 to the stat below.
          </Txt>
        </Group>

        <Group label="Raises">
          <Segmented<StatKey>
            wrap
            value={quest.stat}
            onChange={(v) => set('stat', v)}
            options={STAT_KEYS.map((k) => ({ value: k, label: STAT_INFO[k].name, icon: STAT_INFO[k].icon }))}
          />
        </Group>

        <Group label="Category">
          <Segmented
            wrap
            value={quest.category}
            onChange={(v) => set('category', v)}
            options={CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_INFO[c].name, icon: CATEGORY_INFO[c].icon }))}
          />
        </Group>

        <Group label="Time of day">
          <Segmented<QuestSlot> wrap value={quest.slot} onChange={(v) => set('slot', v)} options={SLOT_OPTIONS} />
        </Group>

        <Group label="Repeats">
          <Segmented<QuestRepeat> wrap value={quest.repeat} onChange={(v) => set('repeat', v)} options={REPEAT_OPTIONS} />
        </Group>

        <Btn label={submitLabel} icon="check" disabled={!valid} onPress={() => onSubmit(quest)} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  group: { gap: 7 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
