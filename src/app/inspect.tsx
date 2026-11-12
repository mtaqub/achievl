import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { crateById } from '@/arcade/crates';
import { heldLayer } from '@/arcade/loadout';
import { dropValue, findCrateItem, WEAR_GRADES, wearGrade } from '@/arcade/rules';
import { RARITY_COLOR } from '@/arcade/types';
import { tick } from '@/arcade/ui/feedback';
import { hashText, weaponVoxels } from '@/arcade/ui/Weapon';
import { Avatar } from '@/avatar/Avatar';
import { Btn } from '@/components/Btn';
import { Chip, Segmented } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';
import { VoxelView } from '@/voxel/VoxelView';

/** The wear bar: grades left to right with a marker at this drop's float. */
function WearBar({ wear }: { wear: number }) {
  const colours = ['#3FB950', '#8BC34A', '#E3B341', '#F0883E', '#E5534B'];
  const widths = WEAR_GRADES.map((g, i) => g.max - (i === 0 ? 0 : WEAR_GRADES[i - 1].max));
  return (
    <View style={styles.wear}>
      <View style={styles.wearTrack}>
        {WEAR_GRADES.map((g, i) => (
          <View key={g.name} style={{ flex: widths[i], backgroundColor: colours[i % colours.length] }} />
        ))}
      </View>
      <View style={[styles.wearMark, { left: `${Math.min(99.5, wear * 100)}%` }]} />
    </View>
  );
}

export default function Inspect() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const drop = useArcade((s) => s.data.inventory.find((d) => d.uid === uid));
  const equipped = useArcade((s) => s.data.equipped);
  const equip = useArcade((s) => s.equip);
  const scrap = useArcade((s) => s.scrap);
  const look = useAvatar((s) => s.look);
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 460);
  const [mode, setMode] = useState<'item' | 'hand'>('item');

  // Turn and tilt live in animated values (for springs and flicks) mirrored into state for drawing.
  const angle = useAnimatedValue(-70);
  const tilt = useAnimatedValue(0);
  const [view, setView] = useState({ yaw: -70, pitch: 12 });
  const [current] = useState(() => ({ angle: -70, tilt: 0, frame: 0 }));

  useEffect(() => {
    const redraw = () => {
      if (current.frame) return;
      current.frame = requestAnimationFrame(() => {
        current.frame = 0;
        setView({ yaw: current.angle, pitch: 12 + current.tilt });
      });
    };
    const a = angle.addListener(({ value }) => {
      current.angle = value;
      redraw();
    });
    const t = tilt.addListener(({ value }) => {
      current.tilt = value;
      redraw();
    });
    // The opening swing, like picking the item up.
    Animated.timing(angle, { toValue: -20, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      angle.removeListener(a);
      tilt.removeListener(t);
      if (current.frame) cancelAnimationFrame(current.frame);
    };
  }, [angle, tilt, current]);

  const [pan] = useState(() => {
    const start = { angle: 0, tilt: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        angle.stopAnimation();
        tilt.stopAnimation();
        start.angle = current.angle;
        start.tilt = current.tilt;
      },
      onPanResponderMove: (_, g) => {
        angle.setValue(start.angle - g.dx * 0.7);
        tilt.setValue(Math.max(-20, Math.min(40, start.tilt + g.dy * 0.3)));
      },
      onPanResponderRelease: (_, g) => {
        Animated.decay(angle, { velocity: -g.vx * 0.5, deceleration: 0.994, useNativeDriver: false }).start();
        Animated.spring(tilt, { toValue: 0, friction: 6, useNativeDriver: false }).start();
      },
    });
  });

  const item = drop ? findCrateItem(drop.itemId) : undefined;
  const seed = drop ? hashText(drop.uid) : 0;
  const weaponLayers = useMemo(() => (item && drop ? [{ voxels: weaponVoxels(item, drop.wear, seed) }] : []), [item, drop, seed]);
  const held = useMemo(() => (item && drop ? [heldLayer({ item, drop, wear: drop.wear, seed })] : []), [item, drop, seed]);

  if (!drop || !item) {
    return (
      <Screen title="Inspect" back>
        <Txt color="dim">That item is no longer in your inventory.</Txt>
      </Screen>
    );
  }

  const colour = RARITY_COLOR[item.rarity];
  const crate = crateById(drop.crateId);
  const value = dropValue(drop);
  const isEquipped = equipped === drop.uid;

  // A full flourish spin, like the inspect key.
  const flourish = () => {
    tick();
    angle.stopAnimation((v) => {
      Animated.timing(angle, { toValue: v + 360, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
    });
  };

  const stageH = mode === 'hand' ? size * 0.95 : size * 0.7;

  return (
    <Screen title="Inspect" subtitle={crate?.name} back>
      <Segmented
        options={[
          { value: 'item', label: 'Item', icon: 'rotate-3d-variant' },
          { value: 'hand', label: 'In hand', icon: 'account' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as 'item' | 'hand')}
      />
      <View style={styles.gap} />
      <View style={[styles.stage, { height: stageH }]} {...pan.panHandlers}>
        <LinearGradient colors={['#2A2F37', '#101215']} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,0,0,0)', `${colour}55`]} style={styles.floor} />
        <View pointerEvents="none">
          {mode === 'hand' ? (
            <Avatar look={look} size={stageH} bare yaw={view.yaw} pitch={view.pitch} extra={held} />
          ) : (
            <VoxelView layers={weaponLayers} width={size} height={stageH} yaw={view.yaw} pitch={view.pitch} margin={0.95} />
          )}
        </View>
        <Txt variant="caption" size={10} color="#8A929C" style={styles.hint}>
          drag to turn · tap inspect to spin
        </Txt>
      </View>

      <View style={styles.info}>
        <Txt variant="title" size={20} color={drop.foil ? '#FFB347' : 'text'}>
          {`${drop.foil ? '★ ' : ''}${item.weapon} | ${item.finish}`}
        </Txt>
        <View style={[styles.rule, { backgroundColor: colour }]} />
        {!!item.lore && (
          <Txt color="dim" style={styles.lore}>
            {`“${item.lore}”`}
          </Txt>
        )}
        <View style={styles.chips}>
          <Chip label={item.rarity} color={colour} filled />
          <Chip label={item.pattern === 'plain' ? 'solid' : item.pattern} icon="texture" />
          {item.mod && <Chip label={item.mod} icon="wrench" />}
          {drop.foil && <Chip label="foil" icon="star-four-points" color="#FFB347" />}
          {isEquipped && <Chip label="equipped" icon="check" color={colour} />}
        </View>
        <Txt variant="label" size={10} color="dim">{`exterior · ${wearGrade(drop.wear)}`}</Txt>
        <WearBar wear={drop.wear} />
        <View style={styles.stats}>
          <Txt variant="caption" color="dim">{`float ${drop.wear.toFixed(6)}`}</Txt>
          <Txt variant="caption" color="dim">{`pattern #${seed % 1000}`}</Txt>
          <Txt variant="caption" color="dim">
            {new Date(drop.at).toLocaleDateString()}
          </Txt>
        </View>
        <View style={styles.buttons}>
          <Btn label="Inspect" icon="rotate-3d-variant" variant="secondary" style={styles.flex} onPress={flourish} />
          <Btn
            label={isEquipped ? 'Unequip' : 'Equip'}
            icon={isEquipped ? 'close' : 'hand-back-right'}
            style={styles.flex}
            onPress={() => {
              tick();
              equip(isEquipped ? undefined : drop.uid);
            }}
          />
        </View>
        <Btn
          label={`Scrap +${value}`}
          icon="hammer"
          variant="ghost"
          size="sm"
          onPress={() =>
            confirm({
              title: 'Scrap this item?',
              message: `${item.weapon} | ${item.finish} becomes ${value} shards. This cannot be undone.`,
              confirmLabel: 'Scrap',
              danger: true,
              onConfirm: () => {
                if (isEquipped) equip(undefined);
                scrap([drop.uid]);
                router.back();
              },
            })
          }
        />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Txt variant="caption" color="dim" center>
            done
          </Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { height: 10 },
  stage: { borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  hint: { position: 'absolute', bottom: 8 },
  info: { gap: 10, paddingTop: 14 },
  rule: { height: 3, borderRadius: 2 },
  lore: { fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wear: { height: 14, justifyContent: 'center' },
  wearTrack: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  wearMark: { position: 'absolute', width: 3, height: 14, marginLeft: -1.5, backgroundColor: '#FFFFFF', borderRadius: 1 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  buttons: { flexDirection: 'row', gap: 10 },
});
