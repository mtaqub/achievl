import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { crateById } from '@/arcade/crates';
import { dropValue, findCrateItem, WEAR_GRADES, wearGrade } from '@/arcade/rules';
import { RARITY_COLOR, Silhouette } from '@/arcade/types';
import { tick } from '@/arcade/ui/feedback';
import { hashText, Weapon } from '@/arcade/ui/Weapon';
import { Btn } from '@/components/Btn';
import { Chip, Segmented } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { Avatar } from '@/avatar/Avatar';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';

/** Where the hand closes on each voxel weapon, as a fraction of its width. */
const GRIP_AT: Record<Silhouette, number> = { pistol: 0.2, smg: 0.3, rifle: 0.4, sniper: 0.4, knife: 0.8, karambit: 0.56 };

const EDGE_LAYERS = 5;

/** The wear bar: grades left to right with a marker at this drop's float. */
function WearBar({ wear }: { wear: number }) {
  const colours = ['#3FB950', '#8BC34A', '#E3B341', '#F0883E', '#E5534B'];
  const widths = WEAR_GRADES.map((g, i) => g.max - (i === 0 ? 0 : WEAR_GRADES[i - 1].max));
  return (
    <View style={styles.wear}>
      <View style={styles.wearTrack}>
        {WEAR_GRADES.map((g, i) => {
          const w = widths[i];
          return <View key={g.name} style={{ flex: w, backgroundColor: colours[i % colours.length] }} />;
        })}
      </View>
      <View style={[styles.wearMark, { left: `${Math.min(99.5, wear * 100)}%` }]} />
    </View>
  );
}

export default function Inspect() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const drop = useArcade((s) => s.data.inventory.find((d) => d.uid === uid));
  const scrap = useArcade((s) => s.scrap);
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 460);

  const angle = useAnimatedValue(-35);
  const tilt = useAnimatedValue(0);
  // Mutable mirror of the animated values for the gesture handlers.
  const [current] = useState(() => ({ angle: -35, tilt: 0 }));
  const [mode, setMode] = useState<'item' | 'hand'>('item');
  const look = useAvatar((s) => s.look);

  useEffect(() => {
    const a = angle.addListener(({ value }) => (current.angle = value));
    const t = tilt.addListener(({ value }) => (current.tilt = value));
    // The opening swing, like picking the item up.
    Animated.timing(angle, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      angle.removeListener(a);
      tilt.removeListener(t);
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
        angle.setValue(start.angle + g.dx * 0.7);
        tilt.setValue(Math.max(-28, Math.min(28, start.tilt - g.dy * 0.35)));
      },
      onPanResponderRelease: (_, g) => {
        Animated.decay(angle, { velocity: g.vx * 0.5, deceleration: 0.994, useNativeDriver: false }).start();
        Animated.spring(tilt, { toValue: 0, friction: 6, useNativeDriver: false }).start();
      },
    });
  });

  if (!drop) {
    return (
      <Screen title="Inspect" back>
        <Txt color="dim">That item is no longer in your inventory.</Txt>
      </Screen>
    );
  }
  const item = findCrateItem(drop.itemId);
  if (!item) return null;

  const seed = hashText(drop.uid);
  const colour = RARITY_COLOR[item.rarity];
  const crate = crateById(drop.crateId);
  const value = dropValue(drop);

  // A full flourish spin, like the inspect key.
  const flourish = () => {
    tick();
    angle.stopAnimation((v) => {
      const target = Math.round(v / 360) * 360 + 360;
      Animated.timing(angle, { toValue: target, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
    });
  };

  const wrapped = Animated.modulo(Animated.add(angle, 360000), 360);
  const rotateY = angle.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' });
  const rotateX = tilt.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  // sin of the angle, roughly: how far the edge shows.
  const side = wrapped.interpolate({ inputRange: [0, 90, 180, 270, 360], outputRange: [0, 1, 0, -1, 0] });
  const shine = wrapped.interpolate({ inputRange: [0, 180, 360], outputRange: [-size, size, -size] });
  const back = { transform: [{ rotateY: '180deg' }] };
  const handTurn = wrapped.interpolate({ inputRange: [0, 45, 180, 315, 360], outputRange: ['0deg', '45deg', '0deg', '-45deg', '0deg'] });

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
      <View style={[styles.stage, { height: size * 0.75 }]} {...pan.panHandlers}>
        <LinearGradient colors={['#2A2F37', '#101215']} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,0,0,0)', `${colour}55`]} style={styles.floor} />
        {mode === 'hand' ? (
          <Animated.View style={{ width: size, height: size * 0.72, transform: [{ perspective: 900 }, { rotateY: handTurn }] }}>
            {(() => {
              const a = size * 0.72;
              const left = (size - a) / 2 - size * 0.08;
              const w = a * (item.shape === 'knife' || item.shape === 'karambit' ? 0.55 : item.shape === 'pistol' ? 0.5 : 0.8);
              const hx = left + a * 0.68;
              const hy = a * 0.84;
              const skin = look.skin;
              return (
                <>
                  <View style={{ position: 'absolute', left, top: 0 }}>
                    <Avatar look={look} size={a} uid="holder" bare />
                  </View>
                  <View style={{ position: 'absolute', left: hx - GRIP_AT[item.shape] * w, top: hy - w * 0.42 * 0.55, transform: [{ rotate: '-6deg' }] }}>
                    <Weapon item={item} uid="held" width={w} wear={drop.wear} seed={seed} />
                  </View>
                  <View style={[styles.hand, { left: hx - a * 0.04, top: hy - a * 0.02, width: a * 0.08, height: a * 0.08, backgroundColor: skin }]} />
                </>
              );
            })()}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.spinner, { width: size, height: size * 0.4, transform: [{ perspective: 900 }, { rotateX }, { rotateY }] }]}>
            {Array.from({ length: EDGE_LAYERS }, (_, i) => (
              <Animated.View key={i} style={[styles.face, { transform: [{ translateX: Animated.multiply(side, -(i + 1) * 1.1) }] }]} pointerEvents="none">
                <Weapon item={item} uid={`edge-${i}`} width={size} tint={i === EDGE_LAYERS - 1 ? '#0B0C0E' : '#24272C'} />
              </Animated.View>
            ))}
            <View style={[styles.face, styles.hidden, back]} pointerEvents="none">
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Weapon item={item} uid={`back-${drop.uid}`} width={size} wear={drop.wear} seed={seed + 1} />
              </View>
            </View>
            <View style={[styles.face, styles.hidden]} pointerEvents="none">
              <Weapon item={item} uid={`front-${drop.uid}`} width={size} wear={drop.wear} seed={seed} />
            </View>
          </Animated.View>
        )}
        <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shine }, { rotate: '18deg' }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', drop.foil ? 'rgba(255,200,120,0.22)' : 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
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
            label={`Scrap +${value}`}
            icon="hammer"
            variant="secondary"
            style={styles.flex}
            onPress={() =>
              confirm({
                title: 'Scrap this item?',
                message: `${item.weapon} | ${item.finish} becomes ${value} shards. This cannot be undone.`,
                confirmLabel: 'Scrap',
                danger: true,
                onConfirm: () => {
                  scrap([drop.uid]);
                  router.back();
                },
              })
            }
          />
        </View>
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
  hand: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' },
  stage: { borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  spinner: { alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  hidden: { backfaceVisibility: 'hidden' },
  shine: { position: 'absolute', top: -60, bottom: -60, width: 90 },
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
