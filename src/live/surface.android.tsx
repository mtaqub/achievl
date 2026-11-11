/**
 * Android: an ongoing notification that plays the role of a Live Activity.
 *
 * The layout runs outside the app, so the function below can only use what it is
 * handed in `props` plus the Compose components — nothing else from this file
 * exists where it runs.
 */
import { Column, FilledTonalButton, LinearProgressIndicator, Row, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height, padding, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import type { CustomNotificationFactory } from 'expo-widgets';
import { PermissionsAndroid, Platform } from 'react-native';

import { LiveProps } from '@/game/live';

const NAME = 'AchievlToday';
const ID = 'today';

const layout = (props: LiveProps) => {
  'widget';

  // Water tapped in from this notification shows straight away, before the app records it.
  const waterMl = props.waterMl + props.pendingWaterMl;
  const water = props.waterGoalMl > 0 ? Math.min(1, waterMl / props.waterGoalMl) : 0;
  const waterLabel =
    props.units === 'us'
      ? `${Math.round(waterMl / 29.5735)} / ${Math.round(props.waterGoalMl / 29.5735)} oz`
      : `${Math.round(waterMl / 10) / 100} / ${Math.round(props.waterGoalMl / 10) / 100} L`;

  const header = (
    <Row verticalAlignment="center" horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
      <Column>
        <Text style={{ fontSize: 11 }} color={props.dim} maxLines={1}>
          {props.headline}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }} maxLines={1}>
          {props.title}
        </Text>
      </Column>
      <Text style={{ fontSize: 14, fontWeight: 'bold' }} color={props.accent}>
        {props.points > 0 ? `+${props.points} AP` : `${props.questsDone}/${props.questsTotal}`}
      </Text>
    </Row>
  );

  const meter = (name: string, label: string, value: number, color: string) => (
    <Column modifiers={[fillMaxWidth(), padding(0, 6, 0, 0)]}>
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text style={{ fontSize: 11 }} color={props.dim}>
          {name}
        </Text>
        <Text style={{ fontSize: 11 }} color={props.dim}>
          {label}
        </Text>
      </Row>
      <LinearProgressIndicator progress={value} color={color} modifiers={[fillMaxWidth(), height(6)]} />
    </Column>
  );

  return {
    collapsed: <Column modifiers={[fillMaxWidth(), paddingAll(4)]}>{header}</Column>,
    expanded: (
      <Column modifiers={[fillMaxWidth(), paddingAll(4)]}>
        {header}
        {meter('Food/Drink', props.foodLabel, props.food, props.foodColor)}
        {meter('Water', waterLabel, water, props.waterColor)}
        <Row verticalAlignment="center" horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth(), padding(0, 6, 0, 0)]}>
          <FilledTonalButton onClick={() => ({ pendingWaterMl: props.pendingWaterMl + props.waterStepMl })}>
            <Text>{props.waterStepLabel}</Text>
          </FilledTonalButton>
          <Text style={{ fontSize: 12 }} color={props.dim}>
            {`HP ${props.hp} · ${props.questsDone}/${props.questsTotal} quests`}
          </Text>
        </Row>
      </Column>
    ),
  };
};

// Created on first use so a build without the native module only loses this feature.
let factory: CustomNotificationFactory<LiveProps> | null | undefined;
let unlisten: ((handler: () => void) => () => void) | null = null;
function getFactory(): CustomNotificationFactory<LiveProps> | null {
  if (factory === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a build without the native module still runs
      const widgets = require('expo-widgets') as typeof import('expo-widgets');
      factory = widgets.createCustomNotification<LiveProps>(NAME, layout);
      unlisten = (handler) => {
        const sub = widgets.addUserInteractionListener((event) => {
          if (event.source === NAME) handler();
        });
        return () => sub.remove();
      };
    } catch {
      factory = null;
    }
  }
  return factory;
}

export const liveSupported: boolean = true;

export async function ensureLivePermission(prompt: boolean): Promise<boolean> {
  // Before Android 13 notifications need no runtime permission.
  if (typeof Platform.Version !== 'number' || Platform.Version < 33) return true;
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) return true;
  if (!prompt) return false;
  return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
}

export async function showLive(props: LiveProps): Promise<boolean> {
  const today = getFactory();
  if (!today) return false;
  try {
    const current = await today.get(ID);
    if (current) {
      // Keep any taps the app has not collected yet.
      const shown = await current.getProps();
      await current.update({ ...props, pendingWaterMl: Number(shown.pendingWaterMl) || 0 }, { text: props.title });
    } else {
      await today.post(props, { id: ID, ongoing: true, title: props.player, text: props.title, color: props.accent, url: props.urlHome });
    }
    return true;
  } catch {
    // Notifications are disabled for the app.
    return false;
  }
}

export async function hideLive(): Promise<void> {
  const today = getFactory();
  if (!today) return;
  try {
    await today.cancelAll();
  } catch {
    // Nothing to cancel.
  }
}

export async function takePendingWater(): Promise<number> {
  const today = getFactory();
  if (!today) return 0;
  try {
    const current = await today.get(ID);
    if (!current) return 0;
    const shown = await current.getProps();
    const pending = Number(shown.pendingWaterMl) || 0;
    if (pending > 0) await current.update({ ...shown, pendingWaterMl: 0 });
    return pending;
  } catch {
    return 0;
  }
}

export function onLiveInteraction(handler: () => void): () => void {
  getFactory();
  return unlisten ? unlisten(handler) : () => {};
}
