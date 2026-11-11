import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { makeId } from '@/game/engine';
import { Food, Nutrients } from '@/game/types';
import { useGame } from '@/store/useGame';

const FIELDS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
];

const toNumber = (text: string) => {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function FoodCustom() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string; name?: string; brand?: string }>();
  const saveFood = useGame((s) => s.saveFood);
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState(params.brand ?? '');
  const [serving, setServing] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const valid = name.trim().length > 0 && (values.kcal ?? '').trim().length > 0;

  const save = () => {
    const nutrients = Object.fromEntries(FIELDS.map((f) => [f.key, toNumber(values[f.key] ?? '')])) as unknown as Nutrients;
    const food: Food = {
      // A food entered for a barcode is found again the next time that barcode is scanned.
      id: params.barcode ? `scan:${params.barcode}` : makeId('custom'),
      name: name.trim(),
      brand: brand.trim() || undefined,
      serving: serving.trim() || '1 serving',
      nutrients,
      barcode: params.barcode,
      source: params.barcode ? 'scan' : 'custom',
    };
    saveFood(food);
    router.replace({ pathname: '/food-detail', params: { id: food.id } });
  };

  return (
    <Screen
      title="Custom food"
      subtitle={params.barcode ? `For barcode ${params.barcode}` : 'Copy the numbers off the label'}
      back
      footer={<Btn label="Save food" icon="content-save" disabled={!valid} onPress={save} />}>
      <Panel title="What is it" icon="food-apple">
        <View style={styles.block}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Grandma's chili" maxLength={60} />
          <Field label="Brand (optional)" value={brand} onChangeText={setBrand} maxLength={40} />
          <Field label="Serving size" value={serving} onChangeText={setServing} placeholder="1 bowl (300 g)" maxLength={40} />
        </View>
      </Panel>

      <Panel title="Per serving" icon="nutrition">
        <View style={styles.grid}>
          {FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              suffix={f.unit}
              value={values[f.key] ?? ''}
              onChangeText={(text) => setValues((v) => ({ ...v, [f.key]: text }))}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.cell}
            />
          ))}
        </View>
        <Txt variant="caption" color="dim" style={styles.note}>
          Calories are required. Anything left blank counts as zero, which makes the fuel rating less accurate.
        </Txt>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
  note: { marginTop: 10 },
});
