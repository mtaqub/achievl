import React, { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { canSpinFree, WHEEL, WHEEL_PRICE, WHEEL_TOTAL } from '@/arcade/gacha';
import { reveal, tick } from '@/arcade/ui/feedback';
import { Btn } from '@/components/Btn';
import { Divider } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useClock } from '@/hooks/useClock';
import { useArcade } from '@/store/useArcade';
import { useTheme } from '@/theme/ThemeProvider';

const SIZE = 280;
const R = SIZE / 2;
const SLICE = 360 / WHEEL.length;

function slicePath(i: number): string {
  const a0 = ((i * SLICE - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * SLICE - 90) * Math.PI) / 180;
  const r = R - 6;
  return `M${R} ${R} L${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)} Z`;
}

/** Every slice is the same size on screen; the odds come from the weights, shown below. */
function Wheel() {
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={R} cy={R} r={R - 1} fill="#1B1D22" />
      {WHEEL.map((prize, i) => (
        <G key={prize.label}>
          <Path d={slicePath(i)} fill={prize.color} stroke="#1B1D22" strokeWidth={2} />
          <G transform={`rotate(${i * SLICE + SLICE / 2} ${R} ${R})`}>
            <SvgText x={R} y={34} fill="#FFFFFF" fontSize={13} fontWeight="bold" textAnchor="middle">
              {prize.label}
            </SvgText>
          </G>
        </G>
      ))}
      <Circle cx={R} cy={R} r={22} fill="#F2F2F2" stroke="#1B1D22" strokeWidth={3} />
      {WHEEL.map((_, i) => {
        const a = ((i * SLICE - 90) * Math.PI) / 180;
        return <Circle key={i} cx={R + (R - 4) * Math.cos(a)} cy={R + (R - 4) * Math.sin(a)} r={3} fill="#FFE680" />;
      })}
    </Svg>
  );
}

export default function PrizeWheel() {
  const { colors } = useTheme();
  const { today } = useClock();
  const data = useArcade((s) => s.data);
  const spinWheel = useArcade((s) => s.spinWheel);
  const turn = useAnimatedValue(0);
  const total = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  const free = canSpinFree(data, today);

  const spin = () => {
    const index = spinWheel(today);
    if (typeof index === 'string') return;
    tick();
    setWon(null);
    setSpinning(true);
    // Land the middle of the slice under the pointer at the top, with a little jitter.
    const jitter = (Math.random() - 0.5) * SLICE * 0.6;
    const landing = 360 - (index * SLICE + SLICE / 2) + jitter;
    const current = total.current % 360;
    total.current += 360 * 5 + ((landing - current + 360) % 360);
    Animated.timing(turn, { toValue: total.current, duration: 4200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setSpinning(false);
      setWon(index);
      const prize = WHEEL[index];
      reveal(prize.label === 'jackpot' ? 4 : prize.kind === 'shards' && prize.amount < 25 ? 1 : 3);
    });
  };

  const rotate = turn.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  return (
    <Screen title="Prize wheel" subtitle={`${data.shards} shards`} back>
      <Panel>
        <View style={styles.stage}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Wheel />
          </Animated.View>
          <View style={[styles.pointer, { borderTopColor: colors.text }]} />
        </View>
        {won !== null && (
          <Txt variant="title" size={20} center color={WHEEL[won].color} style={styles.won}>
            {WHEEL[won].label === 'jackpot' ? `jackpot! +${WHEEL[won].amount} shards` : `+${WHEEL[won].label}`}
          </Txt>
        )}
        <Btn
          label={spinning ? 'Spinning…' : free ? 'Spin · free today' : `Spin · ${WHEEL_PRICE} shards`}
          icon="ferris-wheel"
          disabled={spinning || (!free && data.shards < WHEEL_PRICE)}
          onPress={spin}
        />
        <Txt variant="caption" color="dim" center style={styles.note}>
          One free spin every day. Keys and boxes land straight in your wallet.
        </Txt>
      </Panel>

      <Panel title="Odds" icon="percent">
        {WHEEL.map((prize, i) => (
          <View key={prize.label}>
            {i > 0 && <Divider />}
            <View style={styles.odds}>
              <View style={[styles.dot, { backgroundColor: prize.color }]} />
              <Txt style={styles.flex}>{prize.label === 'jackpot' ? `jackpot · ${prize.amount} shards` : prize.label}</Txt>
              <Txt variant="bodyStrong">{`${((prize.weight / WHEEL_TOTAL) * 100).toFixed(1)}%`}</Txt>
            </View>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { alignItems: 'center', paddingTop: 18, paddingBottom: 14 },
  pointer: {
    position: 'absolute',
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  won: { marginBottom: 10 },
  note: { marginTop: 8 },
  odds: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
