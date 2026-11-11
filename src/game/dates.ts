/** Local-time day key, e.g. "2026-11-11". Days roll over at the user's midnight. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses a day key at local noon so DST shifts can never push it onto a neighbouring day. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function isWeekend(key: string): boolean {
  const dow = parseDayKey(key).getDay();
  return dow === 0 || dow === 6;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDay(key: string): string {
  const d = parseDayKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortDay(key: string): string {
  const d = parseDayKey(key);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Hour of day as a decimal, e.g. 14.5 for 2:30 PM. */
export function decimalHour(d: Date = new Date()): number {
  return d.getHours() + d.getMinutes() / 60;
}
