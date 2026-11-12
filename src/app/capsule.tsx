import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CAPSULE_ODDS, CAPSULE_PRICE, CAPSULE_RARITIES, CAPSULE_REFUND, CapsulePull, canTwistFree } from '@/arcade/gacha';
import { CAPSULE_RARITY_COLOR } from '@/arcade/types';
import { reveal, thud, tick } from '@/arcade/ui/feedback';
import { Avatar } from '@/avatar/Avatar';
import { CAPSULE_PARTS, capsulePart, SLOT_LABEL } from '@/avatar/parts';
import { Btn } from '@/components/Btn';
import { Chip, Divider } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useClock } from '@/hooks/useClock';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';

const LEVEL = { common: 1, rare: 2, epic: 3, legendary: 4 } as const;
const BALLS = ['#FF5C8A', '#FFD23F', '#4BD6FF', '#7CFF8C', '#B07CFF', '#FF9D5C', '#5C8CFF', '#FF5CF0', '#5CFFD6'];

/** The machine: a glass dome of capsules over a red body with a knob. */
function Machine({ knob }: { knob: Animated.AnimatedInterpolation<string> }) {
  return (
    <View style={styles.machine}>
      <Svg width={200} height={260} viewBox="0 0 200 260">
        <Rect x={30} y={120} width={140} height={130} rx={14} fill="#D9483B" stroke="#7A1E16" strokeWidth={3} />
        <Rect x={70} y={200} width={60} height={40} rx={8} fill="#2A0E0A" />
        <Circle cx={100} cy={70} r={68} fill="rgba(200,235,255,0.25)" stroke="#E8F6FF" strokeWidth={3} />
        {BALLS.map((c, i) => (
          <Circle
            key={i}
            cx={52 + (i % 4) * 30 + (i > 3 ? 14 : 0)}
            cy={i < 4 ? 108 : i < 8 ? 84 : 62}
            r={13}
            fill={c}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1.5}
          />
        ))}
        <Path d="M60 30 Q80 14 104 16" stroke="rgba(255,255,255,0.7)" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Rect x={20} y={116} width={160} height={14} rx={7} fill="#B3261E" />
      </Svg>
      <Animated.View style={[styles.knob, { transform: [{ rotate: knob }] }]}>
        <View style={styles.knobBar} />
      </Animated.View>
    </View>
  );
}

export default function Capsule() {
  const router = useRouter();
  const { today } = useClock();
  const data = useArcade((s) => s.data);
  const twist = useArcade((s) => s.twistCapsule);
  const look = useAvatar((s) => s.look);
  const wear = useAvatar((s) => s.set);
  const [pull, setPull] = useState<CapsulePull | null>(null);
  const [stage, setStage] = useState<'idle' | 'dropping' | 'closed' | 'open'>('idle');
  const knob = useAnimatedValue(0);
  const drop = useAnimatedValue(0);
  const split = useAnimatedValue(0);

  const free = canTwistFree(data, today);
  const canPay = data.shards >= CAPSULE_PRICE;
  const owned = Object.keys(data.avatarItems).length;

  const go = () => {
    const result = twist(today);
    if (typeof result === 'string') return;
    tick();
    setPull(result);
    setStage('dropping');
    knob.setValue(0);
    drop.setValue(0);
    split.setValue(0);
    Animated.sequence([
      Animated.timing(knob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(drop, { toValue: 1, duration: 650, easing: Easing.bounce, useNativeDriver: true }),
    ]).start(() => {
      thud();
      setStage('closed');
    });
  };

  const open = () => {
    if (!pull) return;
    setStage('open');
    reveal(LEVEL[pull.rarity]);
    Animated.spring(split, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const info = pull ? capsulePart(pull.key) : undefined;
  const colour = pull ? CAPSULE_RARITY_COLOR[pull.rarity] : '#FFFFFF';
  const capsuleY = drop.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });
  const topY = split.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const topR = split.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-25deg'] });
  const botY = split.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });

  return (
    <Screen title="Capsule machine" subtitle={`${data.shards} shards · ${owned} of ${CAPSULE_PARTS.length} parts`} back>
      <Panel>
        <View style={styles.stage}>
          <Machine knob={knob.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })} />
          <View style={styles.tray}>
            {stage !== 'idle' && pull && (
              <Animated.View style={{ transform: [{ translateY: capsuleY }] }}>
                {stage === 'open' && info && (
                  <View style={styles.prize}>
                    <Avatar look={{ ...look, [info.slot]: info.part.id }} size={110} uid="capsule-prize" />
                  </View>
                )}
                <Pressable onPress={stage === 'closed' ? open : undefined} accessibilityRole="button" accessibilityLabel="Open the capsule">
                  <Animated.View style={[styles.half, styles.top, { backgroundColor: colour, transform: [{ translateY: topY }, { rotate: topR }] }]} />
                  <Animated.View style={[styles.half, styles.bottom, { transform: [{ translateY: botY }] }]} />
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>

        {stage === 'closed' && (
          <Txt center color="dim">
            tap the capsule to open it
          </Txt>
        )}
        {stage === 'open' && pull && info && (
          <View style={styles.result}>
            <Txt variant="title" size={18} center>
              {info.part.name}
            </Txt>
            <View style={styles.chips}>
              <Chip label={pull.rarity} color={colour} filled />
              <Chip label={SLOT_LABEL[info.slot]} />
              {pull.duplicate && <Chip label={`duplicate +${pull.refund} shards`} icon="diamond-stone" />}
            </View>
            {!pull.duplicate && (
              <Btn
                label="Wear it"
                icon="account-check"
                size="sm"
                onPress={() => {
                  wear(info.slot, info.part.id);
                  router.push('/avatar');
                }}
              />
            )}
          </View>
        )}

        <Btn
          label={stage === 'dropping' ? 'Twisting…' : free ? 'Twist · free today' : `Twist · ${CAPSULE_PRICE} shards`}
          icon="rotate-right"
          disabled={stage === 'dropping' || (!free && !canPay)}
          onPress={go}
          style={styles.twist}
        />
        <Txt variant="caption" color="dim" center>
          One free twist every day. Capsules hold hats, glasses, tops and backgrounds for your avatar.
        </Txt>
      </Panel>

      <Panel title="Odds" icon="percent">
        {CAPSULE_RARITIES.map((r, i) => (
          <View key={r}>
            {i > 0 && <Divider />}
            <View style={styles.odds}>
              <View style={[styles.dot, { backgroundColor: CAPSULE_RARITY_COLOR[r] }]} />
              <Txt variant="bodyStrong" style={styles.flex}>
                {r}
              </Txt>
              <Txt variant="caption" color="dim">{`dupe +${CAPSULE_REFUND[r]}`}</Txt>
              <Txt variant="bodyStrong" color={CAPSULE_RARITY_COLOR[r]}>{`${Math.round(CAPSULE_ODDS[r] * 100)}%`}</Txt>
            </View>
            <Txt variant="caption" color="dim" style={styles.names}>
              {CAPSULE_PARTS.filter((c) => c.part.capsule === r)
                .map((c) => (data.avatarItems[c.key] ? `✓ ${c.part.name}` : c.part.name))
                .join(' · ')}
            </Txt>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { alignItems: 'center' },
  machine: { width: 200, height: 260 },
  knob: {
    position: 'absolute',
    left: 82,
    top: 140,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    borderWidth: 3,
    borderColor: '#7A1E16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobBar: { width: 26, height: 6, borderRadius: 3, backgroundColor: '#7A1E16' },
  tray: { height: 150, width: '100%', alignItems: 'center', justifyContent: 'center' },
  prize: { position: 'absolute', alignSelf: 'center', top: -30 },
  half: { width: 70, height: 35, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  top: { borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  bottom: { backgroundColor: '#F2F2F2', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, marginTop: -2 },
  result: { alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  twist: { marginTop: 12, marginBottom: 6 },
  odds: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  names: { paddingLeft: 20, paddingBottom: 10, paddingTop: 2 },
});
