/**
 * iOS: a Live Activity on the Lock Screen and in the Dynamic Island.
 *
 * The layout runs in the widget extension, not in the app, so the function below
 * can only use what it is handed in `props` plus the SwiftUI components — nothing
 * else from this file exists where it runs.
 */
import { HStack, Image, Link, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, buttonStyle, font, foregroundStyle, lineLimit, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import type { LiveActivity, LiveActivityFactory } from 'expo-widgets';

import { LiveProps } from '@/game/live';

const NAME = 'AchievlToday';

const layout = (props: LiveProps) => {
  'widget';

  const meter = (symbol: 'fork.knife' | 'drop.fill', color: string, value: number, label: string) => (
    <HStack spacing={8}>
      <Image systemName={symbol} size={13} color={color} />
      <ProgressView value={value} modifiers={[tint(color)]} />
      <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(props.dim), lineLimit(1)]}>{label}</Text>
    </HStack>
  );

  const action = (label: string, url: string) => (
    <Link label={label} destination={url} modifiers={[buttonStyle('bordered'), tint(props.accent), font({ size: 13, weight: 'semibold' })]} />
  );

  const unlock = (
    <VStack alignment="leading" spacing={1}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(props.dim), lineLimit(1)]}>{props.headline}</Text>
      <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(props.text), lineLimit(1)]}>{props.title}</Text>
    </VStack>
  );

  const tally = (
    <VStack alignment="trailing" spacing={1}>
      <Text modifiers={[font({ size: 15, weight: 'bold' }), monospacedDigit(), foregroundStyle(props.accent)]}>
        {props.points > 0 ? `+${props.points} AP` : `${props.dayPoints} AP`}
      </Text>
      <Text modifiers={[font({ size: 11 }), monospacedDigit(), foregroundStyle(props.dim)]}>
        {props.questsDone}/{props.questsTotal} quests
      </Text>
    </VStack>
  );

  const actions = (
    <HStack spacing={8}>
      {action(props.waterStepLabel, props.urlWater)}
      {action('Log food', props.urlFood)}
      {action('Scan', props.urlScan)}
      <Spacer />
      <Image systemName="heart.fill" size={12} color={props.hpColor} />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit(), foregroundStyle(props.text)]}>{props.hp}</Text>
    </HStack>
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={9} modifiers={[padding({ all: 14 }), activityBackgroundTint(props.bg)]}>
        <HStack spacing={10}>
          <Image systemName="trophy.fill" size={22} color={props.accent} />
          {unlock}
          <Spacer />
          {tally}
        </HStack>
        {meter('fork.knife', props.foodColor, props.food, props.foodLabel)}
        {meter('drop.fill', props.waterColor, props.water, props.waterLabel)}
        {actions}
      </VStack>
    ),
    compactLeading: <Image systemName="trophy.fill" size={14} color={props.accent} />,
    compactTrailing: (
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit()]}>
        {props.questsDone}/{props.questsTotal}
      </Text>
    ),
    minimal: <Image systemName="trophy.fill" size={13} color={props.accent} />,
    expandedLeading: (
      <HStack spacing={5} modifiers={[padding({ leading: 6, top: 4 })]}>
        <Image systemName="heart.fill" size={13} color={props.hpColor} />
        <Text modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit()]}>{props.hp}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <Text modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit(), foregroundStyle(props.accent), padding({ trailing: 6, top: 4 })]}>
        {props.questsDone}/{props.questsTotal}
      </Text>
    ),
    expandedCenter: (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), lineLimit(1)]}>{props.points > 0 ? `${props.title} +${props.points}` : props.title}</Text>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ horizontal: 6, bottom: 4 })]}>
        {meter('fork.knife', props.foodColor, props.food, props.foodLabel)}
        {meter('drop.fill', props.waterColor, props.water, props.waterLabel)}
        <HStack spacing={8}>
          {action(props.waterStepLabel, props.urlWater)}
          {action('Log food', props.urlFood)}
          {action('Scan', props.urlScan)}
        </HStack>
      </VStack>
    ),
  };
};

// Created on first use so a build without the widget extension only loses this feature.
let factory: LiveActivityFactory<LiveProps> | null | undefined;
function getFactory(): LiveActivityFactory<LiveProps> | null {
  if (factory === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
      const { createLiveActivity } = require('expo-widgets') as typeof import('expo-widgets');
      factory = createLiveActivity<LiveProps>(NAME, layout);
    } catch {
      factory = null;
    }
  }
  return factory;
}

export const liveSupported: boolean = true;

export async function showLive(props: LiveProps): Promise<boolean> {
  const today = getFactory();
  if (!today) return false;
  try {
    const [current, ...extras] = today.getInstances() as LiveActivity<LiveProps>[];
    await Promise.all(extras.map((extra) => extra.end('immediate')));
    if (current) {
      await current.update(props);
    } else {
      // Only allowed while the app is on screen; the system ends it after about eight hours.
      today.start(props, props.urlHome);
    }
    return true;
  } catch {
    // Live Activities are off in Settings, or the app is in the background.
    return false;
  }
}

export async function hideLive(): Promise<void> {
  const today = getFactory();
  if (!today) return;
  try {
    await Promise.all(today.getInstances().map((instance) => instance.end('immediate')));
  } catch {
    // Nothing to end.
  }
}

/** Lock Screen actions on iOS open the app through links, so there is never anything pending. */
export async function takePendingWater(): Promise<number> {
  return 0;
}

export function onLiveInteraction(_handler: () => void): () => void {
  return () => {};
}

/** iOS asks nothing up front: Live Activities are on unless the user turns them off in Settings. */
export async function ensureLivePermission(_prompt: boolean): Promise<boolean> {
  return true;
}
