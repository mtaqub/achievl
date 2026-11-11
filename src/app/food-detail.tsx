import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradeBadge, gradeColor } from '@/components/badges';
import { Btn } from '@/components/Btn';
import { Chip, Segmented, Stepper } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { NutritionFacts } from '@/components/NutritionFacts';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { findFood } from '@/data/findFood';
import { mealForHour, MEALS } from '@/data/meals';
import { decimalHour } from '@/game/dates';
import { GRADE_BLURB, judgeFood, scaleNutrients } from '@/game/nutrition';
import { Meal, STAT_INFO, StatKey } from '@/game/types';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

export default function FoodDetail() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myFoods = useGame((s) => s.data.myFoods);
  const logFood = useGame((s) => s.logFood);
  const removeSavedFood = useGame((s) => s.removeSavedFood);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(() => mealForHour(decimalHour()));

  const food = findFood(id, myFoods);
  if (!food) return <Redirect href="/food-add" />;

  const verdict = judgeFood(food, servings);
  const stats = Object.entries(verdict.stats) as [StatKey, number][];

  const log = () => {
    logFood(food, servings, meal);
    // Back to the tabs, landing on the food log.
    router.dismissAll();
    router.navigate('/fuel');
  };

  return (
    <Screen
      title={food.name}
      subtitle={`${food.brand ? `${food.brand} · ` : ''}per ${food.serving}`}
      back
      footer={<Btn label={`Log it · +${verdict.xp} XP`} icon="check" onPress={log} />}>
      <Panel title="Fuel rating" icon="star-circle">
        <View style={styles.rating}>
          <GradeBadge grade={verdict.grade} size={56} />
          <View style={styles.flex}>
            <Txt variant="heading" color={gradeColor(theme, verdict.grade)}>
              {GRADE_BLURB[verdict.grade]}
            </Txt>
            <Txt variant="caption" color="dim">
              {`Score ${verdict.score}/100 from protein, fibre, sugar, saturated fat and sodium${food.processing ? ', adjusted for how processed it is' : ''}.`}
            </Txt>
          </View>
        </View>
        {(stats.length > 0 || verdict.buffs.length > 0 || verdict.debuffs.length > 0) && (
          <View style={styles.chips}>
            {stats.map(([key, value]) => (
              <Chip key={key} icon={STAT_INFO[key].icon} label={`+${value} ${key}`} color={colors.accent} />
            ))}
            {verdict.buffs.map((b) => (
              <Chip key={b} icon="arrow-up-bold" label={b} color={colors.xp} />
            ))}
            {verdict.debuffs.map((d) => (
              <Chip key={d} icon="alert-circle-outline" label={d} color={colors.danger} />
            ))}
          </View>
        )}
      </Panel>

      <Panel title="How much" icon="scale-balance">
        <View style={styles.block}>
          <View style={styles.servings}>
            <View style={styles.flex}>
              <Txt variant="bodyStrong">Servings</Txt>
              <Txt variant="caption" color="dim">{`1 serving = ${food.serving}`}</Txt>
            </View>
            <Stepper label="servings" value={servings} onChange={setServings} step={0.5} min={0.5} max={20} />
          </View>
          <Segmented<Meal> wrap value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.meal, label: m.title, icon: m.icon }))} />
        </View>
      </Panel>

      <Panel title={servings === 1 ? 'Nutrition facts' : `Nutrition facts × ${servings}`} icon="nutrition">
        <NutritionFacts nutrients={scaleNutrients(food.nutrients, servings)} />
        {food.source === 'builtin' && (
          <Txt variant="caption" color="dim" style={styles.note}>
            Typical values. Scan the package for the exact figures.
          </Txt>
        )}
        {food.source === 'scan' && (
          <Txt variant="caption" color="dim" style={styles.note}>
            {`From Open Food Facts, a community database. Barcode ${food.barcode}.`}
          </Txt>
        )}
      </Panel>

      {food.source !== 'builtin' && (
        <Btn
          label="Delete from my foods"
          icon="trash-can-outline"
          variant="danger"
          onPress={() =>
            confirm({
              title: 'Delete this food?',
              message: `"${food.name}" is removed from your saved foods. Entries already logged stay.`,
              confirmLabel: 'Delete',
              danger: true,
              onConfirm: () => {
                removeSavedFood(food.id);
                router.back();
              },
            })
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  block: { gap: 14 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { marginTop: 8 },
});
