import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field, Segmented } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { AVATAR_COLORS, AVATAR_ICONS } from '@/game/engine';
import { ML_PER_FL_OZ } from '@/game/nutrition';
import { Goals, Units } from '@/game/types';
import { live } from '@/live';
import { canChangeAppIcon } from '@/services/appIcon';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

type OnOff = 'on' | 'off';
const ON_OFF: { value: OnOff; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

const LIVE_BLURB =
  Platform.OS === 'ios'
    ? 'Shows your latest achievement and the food and water meters on the Lock Screen and in the Dynamic Island, with shortcuts to log water or food. iOS ends a Live Activity after about eight hours; opening Achievl starts it again.'
    : Platform.OS === 'android'
      ? 'Keeps a notification with your latest achievement and the food and water meters, plus a button that logs water without opening the app.'
      : 'Available in the iOS and Android apps.';

/** A number field that saves when the player leaves it, and snaps back if the entry is not a number. */
function GoalField({ label, unit, value, onSave }: { label: string; unit: string; value: number; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [seen, setSeen] = useState(value);
  // Follow outside changes (a unit switch, a reset) without fighting the player's typing.
  if (value !== seen) {
    setSeen(value);
    setDraft(String(value));
  }
  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) onSave(n);
    else setDraft(String(value));
  };
  return (
    <Field
      label={label}
      suffix={unit}
      value={draft}
      onChangeText={setDraft}
      onEndEditing={commit}
      onBlur={commit}
      keyboardType="decimal-pad"
      containerStyle={styles.cell}
    />
  );
}

export default function Settings() {
  const { colors, shape } = useTheme();
  const data = useGame((s) => s.data);
  const setProfile = useGame((s) => s.setProfile);
  const setGoals = useGame((s) => s.setGoals);
  const setUnits = useGame((s) => s.setUnits);
  const setMatchIcon = useGame((s) => s.setMatchIcon);
  const setLiveEnabled = useGame((s) => s.setLiveEnabled);
  const resetAll = useGame((s) => s.resetAll);
  const [name, setName] = useState(data.profile.name);
  const [motto, setMotto] = useState(data.profile.motto);

  const goal = (key: keyof Goals) => (value: number) => setGoals({ [key]: value });
  const waterShown = data.units === 'us' ? Math.round(data.goals.waterMl / ML_PER_FL_OZ) : data.goals.waterMl;

  const toggleLive = async (value: OnOff) => {
    if (value === 'on') await live.ensurePermission(true);
    setLiveEnabled(value === 'on');
  };

  return (
    <Screen title="Settings" subtitle="Player, goals and app options" back>
      <Panel title="Player" icon="account-circle">
        <View style={styles.block}>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            onEndEditing={() => setProfile({ name })}
            onBlur={() => setProfile({ name })}
            maxLength={16}
            returnKeyType="done"
          />
          <Field
            label="Motto"
            value={motto}
            onChangeText={setMotto}
            onEndEditing={() => setProfile({ motto })}
            onBlur={() => setProfile({ motto })}
            maxLength={60}
            returnKeyType="done"
          />
          <View style={styles.group}>
            <Txt variant="label" color="dim">
              Picture
            </Txt>
            <View style={styles.grid}>
              {AVATAR_ICONS.map((icon) => {
                const on = data.profile.avatar === icon;
                return (
                  <Pressable
                    key={icon}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={icon.replace(/-/g, ' ')}
                    onPress={() => setProfile({ avatar: icon })}
                    style={[
                      styles.swatch,
                      {
                        borderRadius: shape.radius,
                        borderColor: on ? colors.accent : colors.insetBorder,
                        backgroundColor: on ? data.profile.color : colors.inset,
                      },
                    ]}>
                    <Icon name={icon} size={24} color={on ? '#FFFFFF' : colors.textDim} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.group}>
            <Txt variant="label" color="dim">
              Colour
            </Txt>
            <View style={styles.grid}>
              {AVATAR_COLORS.map((color, i) => {
                const on = data.profile.color === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Colour ${i + 1}`}
                    onPress={() => setProfile({ color })}
                    style={[
                      styles.swatch,
                      { borderRadius: shape.radius, backgroundColor: color, borderColor: on ? colors.text : 'transparent', borderWidth: 3 },
                    ]}>
                    {on && <Icon name="check-bold" size={20} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Panel>

      <Panel title="Daily goals" icon="target">
        <View style={styles.block}>
          <View style={styles.cells}>
            <GoalField label="Calories" unit="kcal" value={data.goals.kcal} onSave={goal('kcal')} />
            <GoalField
              label="Water"
              unit={data.units === 'us' ? 'fl oz' : 'ml'}
              value={waterShown}
              onSave={(v) => setGoals({ waterMl: data.units === 'us' ? v * ML_PER_FL_OZ : v })}
            />
            <GoalField label="Protein" unit="g" value={data.goals.protein} onSave={goal('protein')} />
            <GoalField label="Carbs" unit="g" value={data.goals.carbs} onSave={goal('carbs')} />
            <GoalField label="Fat" unit="g" value={data.goals.fat} onSave={goal('fat')} />
          </View>
          <View style={styles.group}>
            <Txt variant="label" color="dim">
              Units
            </Txt>
            <Segmented<Units>
              value={data.units}
              onChange={setUnits}
              options={[
                { value: 'metric', label: 'Metric (ml)' },
                { value: 'us', label: 'US (fl oz)' },
              ]}
            />
          </View>
          <Txt variant="caption" color="dim">
            The meters and your health are measured against these. They are general defaults, not medical advice — set what suits you.
          </Txt>
        </View>
      </Panel>

      <Panel title="Lock Screen tracker" icon="cellphone-lock">
        <View style={styles.block}>
          <Segmented<OnOff> value={data.liveEnabled ? 'on' : 'off'} onChange={toggleLive} options={ON_OFF} />
          <Txt variant="caption" color="dim">
            {LIVE_BLURB}
          </Txt>
        </View>
      </Panel>

      <Panel title="App icon follows era" icon="palette-swatch">
        <View style={styles.block}>
          <Segmented<OnOff> value={data.matchIcon ? 'on' : 'off'} onChange={(v) => setMatchIcon(v === 'on')} options={ON_OFF} />
          <Txt variant="caption" color="dim">
            {canChangeAppIcon()
              ? 'Changing era also changes the icon on your home screen. Off keeps the default icon.'
              : 'Works in the installed iOS and Android apps.'}
          </Txt>
        </View>
      </Panel>

      <Panel title="Data" icon="database-remove">
        <View style={styles.block}>
          <Txt variant="caption" color="dim">
            Everything is stored on this device only. There is no account and nothing is uploaded, apart from barcode numbers sent to Open Food Facts when you
            scan.
          </Txt>
          <Btn
            label="Erase all data"
            icon="trash-can-outline"
            variant="danger"
            onPress={() =>
              confirm({
                title: 'Erase everything?',
                message: 'Your level, quests, food log and settings are deleted from this device. This cannot be undone.',
                confirmLabel: 'Erase',
                danger: true,
                onConfirm: resetAll,
              })
            }
          />
        </View>
      </Panel>

      <Txt variant="caption" color="dim" center>
        {`Achievl ${Constants.expoConfig?.version ?? ''}`}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 14 },
  group: { gap: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  swatch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
