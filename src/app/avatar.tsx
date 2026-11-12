import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CAPSULE_RARITY_COLOR } from '@/arcade/types';
import { tick } from '@/arcade/ui/feedback';
import { Avatar } from '@/avatar/Avatar';
import { LiveAvatar } from '@/avatar/LiveAvatar';
import { canWear, PARTS, randomLook, Slot, SLOT_LABEL, SLOTS } from '@/avatar/parts';
import { Btn } from '@/components/Btn';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';
import { useTheme } from '@/theme/ThemeProvider';

export default function AvatarMaker() {
  const { colors } = useTheme();
  const router = useRouter();
  const look = useAvatar((s) => s.look);
  const setPart = useAvatar((s) => s.set);
  const replace = useAvatar((s) => s.replace);
  const owned = useArcade((s) => s.data.avatarItems);
  const [slot, setSlot] = useState<Slot>('outfit');

  const options = PARTS[slot];
  const isColour = options.every((p) => p.color) && slot !== 'bg';
  const ownedCount = Object.keys(owned).length;

  return (
    <Screen title="Avatar" subtitle="Your face around the app" back>
      <View style={styles.preview}>
        <LiveAvatar look={look} size={210} bare={false} />
      </View>
      <View style={styles.row}>
        <Btn
          label="Shuffle"
          icon="dice-multiple"
          variant="secondary"
          size="sm"
          style={styles.flex}
          onPress={() => {
            tick();
            replace(randomLook(owned));
          }}
        />
        <Btn label="Get more parts" icon="egg-easter" variant="secondary" size="sm" style={styles.flex} onPress={() => router.push('/capsule')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slots}>
        {SLOTS.map((s) => {
          const active = s === slot;
          return (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              style={[styles.slot, { borderColor: active ? colors.accent : colors.insetBorder, backgroundColor: active ? colors.accent : 'transparent' }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}>
              <Txt variant="label" size={11} color={active ? colors.accentText : 'text'}>
                {SLOT_LABEL[s]}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <Panel>
        <View style={styles.grid}>
          {options.map((part) => {
            const wearable = canWear(slot, part, owned);
            const chosen = look[slot] === part.id;
            return (
              <Pressable
                key={part.id}
                disabled={!wearable}
                onPress={() => {
                  tick();
                  setPart(slot, part.id);
                }}
                style={[
                  isColour ? styles.swatchCell : styles.cell,
                  { borderColor: chosen ? colors.accent : part.capsule ? CAPSULE_RARITY_COLOR[part.capsule] : 'transparent', opacity: wearable ? 1 : 0.45 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen, disabled: !wearable }}
                accessibilityLabel={`${SLOT_LABEL[slot]}: ${part.name}${wearable ? '' : ', from the capsule machine'}`}>
                {isColour ? (
                  <View style={[styles.swatch, { backgroundColor: part.color }]} />
                ) : (
                  <Avatar
                    look={part.preset ? { ...look, ...part.preset, outfit: part.id } : { ...look, [slot]: part.id }}
                    size={62}
                    uid={`opt-${slot}-${part.id}`}
                    headOnly={!['outfit', 'top', 'topColor', 'bg'].includes(slot)}
                    round={false}
                  />
                )}
                {!isColour && (
                  <Txt variant="caption" size={9.5} numberOfLines={1} center>
                    {part.name}
                  </Txt>
                )}
                {!wearable && (
                  <View style={styles.lock}>
                    <Icon name="lock" size={14} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Txt variant="caption" color="dim" style={styles.note}>
          {`Locked parts come out of the capsule machine in the arcade. You have ${ownedCount} so far.`}
        </Txt>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 8 },
  slots: { gap: 6, paddingVertical: 12 },
  slot: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderRadius: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: { width: 74, alignItems: 'center', gap: 2, padding: 4, borderWidth: 2, borderRadius: 10 },
  swatchCell: { padding: 3, borderWidth: 2, borderRadius: 24 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  lock: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },
  note: { marginTop: 12 },
});
