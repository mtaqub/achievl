import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradeBadge } from '@/components/badges';
import { Btn } from '@/components/Btn';
import { Divider, IconTile } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { Bar, Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { DEFAULT_FOOD_ICON, SCANNED_FOOD_ICON } from '@/data/foods';
import { MEALS } from '@/data/meals';
import { formatDay } from '@/game/dates';
import { waterStep } from '@/game/live';
import { round2 } from '@/game/leveling';
import { entryNutrients, formatVolume, GRADE_BLURB, gradeForScore, judgeFood } from '@/game/nutrition';
import { FoodEntry } from '@/game/types';
import { useToday } from '@/hooks/useToday';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroHead}>
        <Txt variant="label" size={10.5}>
          {label}
        </Txt>
        <Txt variant="caption" color="dim">{`${Math.round(value)} / ${goal} g`}</Txt>
      </View>
      <Bar value={goal > 0 ? value / goal : 0} color={color} height={10} />
    </View>
  );
}

function EntryRow({ entry, day }: { entry: FoodEntry; day: string }) {
  const { colors } = useTheme();
  const removeFood = useGame((s) => s.removeFood);
  const verdict = judgeFood(entry.food, entry.servings);
  const kcal = Math.round(entryNutrients(entry).kcal);

  return (
    <View style={styles.entry}>
      <IconTile icon={entry.food.icon ?? (entry.food.source === 'scan' ? SCANNED_FOOD_ICON : DEFAULT_FOOD_ICON)} color={colors.food} />
      <View style={styles.entryText}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {entry.food.name}
        </Txt>
        <Txt variant="caption" color="dim" numberOfLines={1}>
          {`${round2(entry.servings)} × ${entry.food.serving} · ${kcal} kcal · +${entry.gain.xp} XP`}
        </Txt>
      </View>
      <GradeBadge grade={verdict.grade} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.food.name}`}
        hitSlop={10}
        onPress={() =>
          confirm({
            title: 'Remove this entry?',
            message: `"${entry.food.name}" comes off today's log and its ${entry.gain.xp} XP is returned.`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => removeFood(day, entry.id),
          })
        }>
        <Icon name="trash-can-outline" size={22} color={colors.textDim} />
      </Pressable>
    </View>
  );
}

export default function Fuel() {
  const { colors } = useTheme();
  const router = useRouter();
  const goals = useGame((s) => s.data.goals);
  const units = useGame((s) => s.data.units);
  const logWater = useGame((s) => s.logWater);
  const undoWater = useGame((s) => s.undoWater);
  const { today, log, nutrients, waterMl, meters, foodScore } = useToday();

  const step = waterStep(units);
  const left = goals.kcal - nutrients.kcal;
  const grade = foodScore === null ? null : gradeForScore(foodScore);

  return (
    <Screen title="Fuel" subtitle={formatDay(today)}>
      <Panel title="Food" icon="food-apple">
        <View style={styles.block}>
          <View style={styles.kcalRow}>
            <View style={styles.kcalText}>
              <Txt variant="number" size={30}>
                {Math.round(nutrients.kcal).toLocaleString('en-US')}
              </Txt>
              <Txt variant="caption" color="dim">
                {left >= 0 ? `${Math.round(left)} kcal left of ${goals.kcal}` : `${Math.round(-left)} kcal over your ${goals.kcal} goal`}
              </Txt>
            </View>
            {grade && (
              <View style={styles.gradeBox}>
                <GradeBadge grade={grade} size={40} />
                <Txt variant="label" size={9.5} color="dim">
                  {GRADE_BLURB[grade]}
                </Txt>
              </View>
            )}
          </View>
          <Bar value={meters.food} color={colors.food} pace={meters.pace} />
          <View style={styles.macros}>
            <Macro label="Protein" value={nutrients.protein} goal={goals.protein} color={colors.hp} />
            <Macro label="Carbs" value={nutrients.carbs} goal={goals.carbs} color={colors.xp} />
            <Macro label="Fat" value={nutrients.fat} goal={goals.fat} color={colors.gold} />
          </View>
          <View style={styles.buttons}>
            <Btn label="Scan" icon="barcode-scan" onPress={() => router.push('/scan')} style={styles.button} accessibilityLabel="Scan barcode" />
            <Btn label="Add food" icon="plus" variant="secondary" onPress={() => router.push('/food-add')} style={styles.button} />
          </View>
        </View>
      </Panel>

      <Panel title="Water" icon="water">
        <View style={styles.block}>
          <Meter
            label="Hydration"
            icon="cup-water"
            color={colors.water}
            value={meters.water}
            pace={meters.pace}
            readout={`${formatVolume(waterMl, units)} / ${formatVolume(goals.waterMl, units)}`}
          />
          <View style={styles.buttons}>
            <Btn
              label={step.label}
              icon="water-plus"
              size="sm"
              onPress={() => logWater(step.ml)}
              style={styles.button}
              accessibilityLabel={`Log ${step.label} of water`}
            />
            <Btn
              label={units === 'us' ? '+16 oz' : '+500 ml'}
              icon="water-plus"
              size="sm"
              onPress={() => logWater(step.ml * 2)}
              style={styles.button}
              accessibilityLabel={`Log ${units === 'us' ? '16 ounces' : '500 millilitres'} of water`}
            />
            <Btn
              label="Undo"
              icon="undo"
              size="sm"
              variant="secondary"
              disabled={log.water.length === 0}
              onPress={undoWater}
              accessibilityLabel="Undo last water entry"
            />
          </View>
        </View>
      </Panel>

      {log.foods.length === 0 ? (
        <Panel title="Today's log" icon="clipboard-list">
          <Txt color="dim">Nothing logged yet. Scan a barcode or pick a food — every entry earns XP and feeds your stats.</Txt>
        </Panel>
      ) : (
        MEALS.map(({ meal, title, icon }) => {
          const entries = log.foods.filter((f) => f.meal === meal);
          if (entries.length === 0) return null;
          const kcal = Math.round(entries.reduce((sum, e) => sum + entryNutrients(e).kcal, 0));
          return (
            <Panel key={meal} title={title} icon={icon} right={<Txt variant="heading" size={13} color={colors.headerText}>{`${kcal} kcal`}</Txt>}>
              {entries.map((entry, i) => (
                <View key={entry.id}>
                  {i > 0 && <Divider />}
                  <EntryRow entry={entry} day={today} />
                </View>
              ))}
            </Panel>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 14 },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kcalText: { flex: 1, gap: 2 },
  gradeBox: { alignItems: 'center', gap: 4 },
  macros: { gap: 10 },
  macro: { gap: 5 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  buttons: { flexDirection: 'row', gap: 8 },
  // Grow from their own width so a longer label gets the room it needs.
  button: { flexGrow: 1 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  entryText: { flex: 1, gap: 2 },
});
