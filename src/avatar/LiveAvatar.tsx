import React, { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import type { Layer } from '@/voxel/engine';

import { Avatar } from './Avatar';
import { AvatarLook } from './parts';

/**
 * The avatar, alive: it breathes (a slow bob), idly looks round, and turns when dragged.
 * The bob runs on the native driver; the turn redraws a few times a second.
 */
export function LiveAvatar({ look, size, extra, bare = true }: { look: AvatarLook; size: number; extra?: Layer[]; bare?: boolean }) {
  const bob = useAnimatedValue(0);
  const [yaw, setYaw] = useState(-28);
  const [state] = useState(() => ({ dragging: false, base: -28, start: 0, t: 0 }));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    // Idle look-around: a slow sway round the resting angle, 12 frames a second.
    const timer = setInterval(() => {
      if (state.dragging) return;
      state.t += 1 / 12;
      setYaw(state.base + Math.sin(state.t * 0.6) * 14);
    }, 1000 / 12);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [bob, state]);

  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderGrant: () => {
        state.dragging = true;
        state.start = state.base + Math.sin(state.t * 0.6) * 14;
      },
      onPanResponderMove: (_, g) => setYaw(state.start - g.dx * 0.8),
      onPanResponderRelease: (_, g) => {
        state.base = state.start - g.dx * 0.8;
        state.t = 0;
        state.dragging = false;
      },
      onPanResponderTerminate: () => {
        state.dragging = false;
      },
    })
  );

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.015] });
  return (
    <View {...pan.panHandlers} style={{ width: size, height: size }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Avatar look={look} size={size} bare={bare} yaw={yaw} extra={extra} />
      </Animated.View>
    </View>
  );
}
