import { addPost, ago, bodyProblem, cleanBody, cleanLine, displayName, explain, LIMITS, Post, threadProblem } from '../rules';

const post = (id: string, at: string): Post => ({ id, thread_id: 't', author: 'a', author_name: 'kei', body: 'hi', created_at: at });

describe('forum text', () => {
  it('cleans titles and bodies', () => {
    expect(cleanLine('  hello \n  there  ')).toBe('hello there');
    expect(cleanBody('one  \r\n\r\n\r\n\r\ntwo\n')).toBe('one\n\ntwo');
  });

  it('falls back to a default name and caps long ones', () => {
    expect(displayName('   ')).toBe('player');
    expect(displayName('x'.repeat(40))).toHaveLength(LIMITS.nameMax);
  });

  it('explains why a thread or reply cannot be posted', () => {
    expect(threadProblem('hi', 'body')).toMatch(/title/);
    expect(threadProblem('x'.repeat(LIMITS.titleMax + 1), 'body')).toMatch(/under/);
    expect(threadProblem('a fine title', '   ')).toMatch(/Write something/);
    expect(threadProblem('a fine title', 'and a body')).toBeNull();
    expect(bodyProblem('x'.repeat(LIMITS.bodyMax + 1))).toMatch(/under/);
    expect(bodyProblem('x'.repeat(LIMITS.bodyMax))).toBeNull();
  });
});

describe('forum times', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  it('shows short relative times', () => {
    expect(ago('2026-11-11T11:59:30Z', now)).toBe('now');
    expect(ago('2026-11-11T11:55:00Z', now)).toBe('5m');
    expect(ago('2026-11-11T09:00:00Z', now)).toBe('3h');
    expect(ago('2026-11-09T12:00:00Z', now)).toBe('2d');
    expect(ago('2026-01-02T12:00:00Z', now)).toMatch(/2026/);
    expect(ago('not a date', now)).toBe('');
    // A clock that is a little behind the server never shows a negative time.
    expect(ago('2026-11-11T12:00:05Z', now)).toBe('now');
  });
});

describe('forum errors', () => {
  it('turns backend messages into plain ones', () => {
    expect(explain({ message: 'slow down: one reply every 5 seconds' })).toMatch(/too fast/);
    expect(explain({ message: 'slow down: one new thread a minute' })).toMatch(/thread a minute/);
    expect(explain({ message: 'Anonymous sign-ins are disabled' })).toMatch(/not fully set up/);
    expect(explain(new TypeError('Failed to fetch'))).toMatch(/connection/);
    expect(explain({ message: 'new row violates row-level security policy' })).toMatch(/would not allow/);
    expect(explain(null)).toMatch(/Something went wrong/);
  });
});

describe('forum post lists', () => {
  it('keeps posts oldest first and ignores repeats', () => {
    const a = post('a', '2026-11-11T10:00:00Z');
    const b = post('b', '2026-11-11T11:00:00Z');
    const c = post('c', '2026-11-11T10:30:00Z');
    const list = addPost(addPost([a], b), c);
    expect(list.map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(addPost(list, { ...b })).toBe(list);
  });
});
