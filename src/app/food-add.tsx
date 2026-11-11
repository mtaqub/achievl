import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradeBadge } from '@/components/badges';
import { Btn } from '@/components/Btn';
import { Divider, Field, Row, Segmented } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILTIN_FOODS, DEFAULT_FOOD_ICON, SCANNED_FOOD_ICON, searchFoods } from '@/data/foods';
import { judgeFood } from '@/game/nutrition';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

type Source = 'all' | 'mine';
const LIMIT = 40;

export default function FoodAdd() {
  const { colors } = useTheme();
  const router = useRouter();
  const myFoods = useGame((s) => s.data.myFoods);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<Source>('all');

  const results = useMemo(() => {
    // The player's own foods come first: they are the ones most likely to be logged again.
    const pool = source === 'mine' ? myFoods : [...myFoods, ...BUILTIN_FOODS];
    return searchFoods(pool, query);
  }, [myFoods, query, source]);

  return (
    <Screen title="Add food/drink" subtitle="Search, scan or enter it yourself" back>
      <View style={styles.buttons}>
        <Btn label="Scan" icon="barcode-scan" onPress={() => router.push('/scan')} style={styles.button} accessibilityLabel="Scan barcode" />
        <Btn
          label="Custom"
          icon="pencil"
          variant="secondary"
          accessibilityLabel="Custom food"
          onPress={() => router.push('/food-custom')}
          style={styles.button}
        />
      </View>

      <Field
        label="Search"
        value={query}
        onChangeText={setQuery}
        placeholder="chicken, oatmeal, pizza…"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <Segmented<Source>
        value={source}
        onChange={setSource}
        options={[
          { value: 'all', label: 'All foods' },
          { value: 'mine', label: `My foods (${myFoods.length})` },
        ]}
      />

      <Panel title={query.trim() ? `${results.length} found` : source === 'mine' ? 'My foods' : 'Foods'} icon="food-apple">
        {results.length === 0 ? (
          <View style={styles.empty}>
            <Txt color="dim">
              {source === 'mine' && myFoods.length === 0
                ? 'Foods you scan or create are kept here for one-tap logging.'
                : 'No match. Scan the barcode or add it as a custom food.'}
            </Txt>
          </View>
        ) : (
          results.slice(0, LIMIT).map((food, i) => (
            <View key={food.id}>
              {i > 0 && <Divider />}
              <Row
                icon={food.icon ?? (food.source === 'scan' ? SCANNED_FOOD_ICON : DEFAULT_FOOD_ICON)}
                iconColor={colors.food}
                title={food.name}
                subtitle={`${food.brand ? `${food.brand} · ` : ''}${food.serving} · ${Math.round(food.nutrients.kcal)} kcal`}
                onPress={() => router.push({ pathname: '/food-detail', params: { id: food.id } })}
                right={<GradeBadge grade={judgeFood(food).grade} />}
              />
            </View>
          ))
        )}
        {results.length > LIMIT && (
          <Txt variant="caption" color="dim" style={styles.more}>
            {`Showing the first ${LIMIT}. Type more to narrow it down.`}
          </Txt>
        )}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
  empty: { paddingVertical: 4 },
  more: { marginTop: 8 },
});
