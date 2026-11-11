/** Limits enforced here for a friendly message, and again by the database for safety. */
export const LIMITS = { nameMax: 24, titleMin: 3, titleMax: 80, bodyMax: 2000 };

export interface Thread {
  id: string;
  author: string;
  author_name: string;
  title: string;
  body: string;
  reply_count: number;
  created_at: string;
  last_post_at: string;
}

export interface Post {
  id: string;
  thread_id: string;
  author: string;
  author_name: string;
  body: string;
  created_at: string;
}

/** One line: trimmed, with runs of white space squeezed to a single space. */
export function cleanLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Several lines: trimmed, trailing spaces dropped, no more than one blank line in a row. */
export function cleanBody(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The name shown next to a post. Players who never set one post as "player". */
export function displayName(name: string): string {
  return cleanLine(name).slice(0, LIMITS.nameMax) || 'player';
}

/** Why a new thread cannot be posted yet, or null when it can. */
export function threadProblem(title: string, body: string): string | null {
  const t = cleanLine(title);
  if (t.length < LIMITS.titleMin) return `Give it a title of at least ${LIMITS.titleMin} characters.`;
  if (t.length > LIMITS.titleMax) return `Keep the title under ${LIMITS.titleMax} characters.`;
  return bodyProblem(body);
}

export function bodyProblem(body: string): string | null {
  const b = cleanBody(body);
  if (b.length === 0) return 'Write something first.';
  if (b.length > LIMITS.bodyMax) return `Keep it under ${LIMITS.bodyMax} characters.`;
  return null;
}

/** "now", "5m", "3h", "2d", then a date. */
export function ago(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Turns whatever the backend said into something a player can act on. */
export function explain(error: unknown): string {
  const raw = typeof error === 'string' ? error : ((error as { message?: string } | null)?.message ?? '');
  const message = raw.toLowerCase();
  if (message.includes('slow down'))
    return message.includes('thread') ? 'One new thread a minute. Give it a moment.' : 'You are posting too fast. Give it a few seconds.';
  if (message.includes('anonymous sign-ins are disabled')) return 'The forum is not fully set up yet: anonymous sign-ins are switched off on the server.';
  if (message.includes('rate limit')) return 'Too many people joined from this network just now. Try again in a little while.';
  if (message.includes('failed to fetch') || message.includes('network request failed') || message.includes('network'))
    return 'Could not reach the forum. Check your connection and try again.';
  if (message.includes('row-level security') || message.includes('permission denied')) return 'The forum would not allow that.';
  if (message.includes('check constraint')) return 'That is too long or too short to post.';
  return 'Something went wrong with the forum. Try again.';
}

/** Adds a post to a list that is kept oldest-first, ignoring one that is already there. */
export function addPost(posts: Post[], post: Post): Post[] {
  if (posts.some((p) => p.id === post.id)) return posts;
  return [...posts, post].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
