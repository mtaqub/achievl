import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey, decimalHour } from '@/game/dates';

export interface Clock {
  /** Today's day key; changes at local midnight. */
  today: string;
  /** Decimal hour, refreshed about twice a minute. */
  hour: number;
}

const read = (): Clock => {
  const now = new Date();
  // Rounded so the value only changes once a minute and does not re-render for nothing.
  return { today: dayKey(now), hour: Math.round(decimalHour(now) * 60) / 60 };
};

/** Keeps "today" and the time of day current, including when the app comes back from the background. */
export function useClock(): Clock {
  const [clock, setClock] = useState(read);

  useEffect(() => {
    const tick = () =>
      setClock((prev) => {
        const next = read();
        return next.today === prev.today && next.hour === prev.hour ? prev : next;
      });
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return clock;
}
