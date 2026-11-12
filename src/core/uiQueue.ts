/**
 * The UI event queue: spectacles (drafts, evolutions, chests, era unlocks, the day's payout)
 * wait here and play one at a time. Ordering is by priority, then strictly first-in-first-out;
 * only the event at the head can be acknowledged, so nothing is skipped or played twice.
 */
import { UIEvent, UIEventQueueState, UIEventType } from './types';

/** The day's payout plays before anything else; every other spectacle is equal and FIFO. */
export const UI_PRIORITY: Readonly<Record<UIEventType, number>> = {
  DAY_SUMMARY_PAYOUT: 0,
  DRAFT_READY: 1,
  EVOLUTION_TRIGGERED: 1,
  CHEST_OPENED: 1,
  ERA_UNLOCKED: 1,
};

export const EMPTY_QUEUE: UIEventQueueState = { events: [], nextSeq: 1 };

const order = (a: UIEvent, b: UIEvent) => a.priority - b.priority || a.seq - b.seq;

export function enqueue(
  queue: UIEventQueueState,
  type: UIEventType,
  payload: Readonly<Record<string, unknown>>,
  now: number
): { queue: UIEventQueueState; event: UIEvent } {
  const event: UIEvent = { id: `${type.toLowerCase()}-${queue.nextSeq}`, type, priority: UI_PRIORITY[type], seq: queue.nextSeq, createdAt: now, payload };
  return { queue: { events: [...queue.events, event].sort(order), nextSeq: queue.nextSeq + 1 }, event };
}

export function peekNextUIEvent(queue: UIEventQueueState): UIEvent | null {
  return queue.events[0] ?? null;
}

/** Removes the head event if `eventId` names it; anything else leaves the queue unchanged. */
export function acknowledgeUIEvent(queue: UIEventQueueState, eventId: string): UIEventQueueState {
  const head = queue.events[0];
  return head && head.id === eventId ? { ...queue, events: queue.events.slice(1) } : queue;
}

export const UIEventQueue = { EMPTY: EMPTY_QUEUE, enqueue, peek: peekNextUIEvent, acknowledge: acknowledgeUIEvent } as const;
