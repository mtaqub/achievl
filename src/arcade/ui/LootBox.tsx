import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useTheme } from '@/theme/ThemeProvider';

import { BoxPull, RARITY_COLOR } from '../types';
import { thud } from './feedback';

const native = Platform.OS !== 'web';
const BOX_W = 150;
const BOX_H = 104;
const ORB = 50;
/** Where the four items come to rest, as offsets from the middle of the box. */
const SLOTS = [-117, -39, 39, 117];

export const BURST_MS = 1900;

/**
 * The box itself: it rattles, the lid blows off and four orbs arc out, each already
 * glowing in its rarity's colour before the item is shown.
 */
export function LootBox({ pulls, onBurst }: { pulls: BoxPull[] | null; onBurst: () => void }) {
  const { colors } = useTheme();
  const bob = useAnimatedValue(0);
  const shake = useAnimatedValue(0);
  const lid = useAnimatedValue(0);
  const flash = useAnimatedValue(0);
  const o0 = useAnimatedValue(0);
  const o1 = useAnimatedValue(0);
  const o2 = useAnimatedValue(0);
  const o3 = useAnimatedValue(0);
  const orbs = [o0, o1, o2, o3];
  const done = useRef(onBurst);
  useEffect(() => {
    done.current = onBurst;
  });

  // Idle: a slow bob so the box looks ready.
  useEffect(() => {
    if (pulls) return;
    for (const v of [shake, lid, flash, o0, o1, o2, o3]) v.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // The animated values are stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulls]);

  useEffect(() => {
    if (!pulls) return;
    const boom = setTimeout(thud, 620);
    const run = Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 620, easing: Easing.linear, useNativeDriver: native }),
      Animated.parallel([
        Animated.timing(lid, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
        Animated.timing(flash, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.stagger(
          110,
          [o0, o1, o2, o3].map((v) => Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: native }))
        ),
      ]),
    ]);
    run.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => {
      clearTimeout(boom);
      run.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulls]);

  const rattle = shake.interpolate({
    inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
    outputRange: ['0deg', '-5deg', '5deg', '-7deg', '7deg', '-9deg', '9deg', '0deg'],
  });
  const squash = shake.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1.04, 0.94] });

  return (
    <View style={styles.stage} accessibilityLabel="Loot box">
      {pulls?.map((pull, i) => {
        const p = orbs[i];
        const colour = RARITY_COLOR[pull.item.rarity];
        return (
          <Animated.View
            key={i}
            style={[
              styles.orb,
              {
                backgroundColor: colour,
                boxShadow: `0px 0px 18px ${colour}`,
                opacity: p.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, SLOTS[i]] }) },
                  // A handful of points along an arc: up fast, hang, then drop into place.
                  { translateY: p.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -128, -196, -216, -192, -150] }) },
                  { scale: p.interpolate({ inputRange: [0, 0.25, 0.9, 1], outputRange: [0.3, 1, 1, 1.12] }) },
                ],
              },
            ]}>
            <View style={styles.orbShine} />
          </Animated.View>
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flash,
          {
            opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3.2] }) }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.box,
          { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { rotate: rattle }, { scale: squash }] },
        ]}>
        <Animated.View
          style={[
            styles.lid,
            {
              opacity: lid.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: lid.interpolate({ inputRange: [0, 1], outputRange: [0, -170] }) },
                { rotate: lid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-38deg'] }) },
              ],
            },
          ]}>
          <LinearGradient colors={colors.accentGradient} style={[StyleSheet.absoluteFill, styles.lidShape]} />
          <View style={[styles.band, { backgroundColor: colors.gold }]} />
        </Animated.View>
        <View style={styles.body}>
          <LinearGradient colors={colors.accentGradient} style={[StyleSheet.absoluteFill, styles.bodyShape]} />
          <View style={[styles.band, { backgroundColor: colors.gold }]} />
          <View style={[styles.clasp, { backgroundColor: colors.gold, borderColor: colors.accentText }]}>
            <Icon name="star-four-points" size={18} color={colors.accentText} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 300, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 },
  box: { width: BOX_W, height: BOX_H, alignItems: 'center' },
  lid: { width: BOX_W + 14, height: 34, alignItems: 'center', zIndex: 2 },
  lidShape: { borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  body: { width: BOX_W, height: BOX_H - 30, marginTop: -4, alignItems: 'center', justifyContent: 'center' },
  bodyShape: { borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  band: { position: 'absolute', top: 0, bottom: 0, width: 26, opacity: 0.9 },
  clasp: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flash: { position: 'absolute', bottom: 40, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF' },
  orb: { position: 'absolute', bottom: 14 + BOX_H / 2, width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  orbShine: {
    position: 'absolute',
    left: 9,
    top: 7,
    width: 16,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '-28deg' }],
  },
});
