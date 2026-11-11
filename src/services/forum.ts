import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { cleanBody, cleanLine, displayName, Post, Thread } from '@/forum/rules';

/**
 * The forum's backend is a Supabase project. Its address and publishable key come
 * from `.env.local` (see `.env.example`); without them the forum shows as offline
 * and the rest of the app is unaffected.
 *
 * Players sign in anonymously the first time they open the forum: no email, no
 * password. The sign-in is remembered on the device.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const forumConfigured = !!url && !!key;

const THREAD_COLUMNS = 'id, author, author_name, title, body, reply_count, created_at, last_post_at';
const POST_COLUMNS = 'id, thread_id, author, author_name, body, created_at';

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!forumConfigured) throw new Error('The forum is not connected in this build.');
  if (!client) {
    client = createClient(url!, key!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

let signingIn: Promise<string> | null = null;

/** The player's forum id, signing them in anonymously the first time. */
export async function forumUser(): Promise<string> {
  const { data } = await db().auth.getSession();
  if (data.session) return data.session.user.id;
  // Two screens asking at once must not create two accounts.
  signingIn ??= (async () => {
    try {
      const result = await db().auth.signInAnonymously();
      if (result.error || !result.data.user) throw result.error ?? new Error('Could not sign in.');
      return result.data.user.id;
    } finally {
      signingIn = null;
    }
  })();
  return signingIn;
}

export async function listThreads(): Promise<Thread[]> {
  await forumUser();
  const { data, error } = await db().from('forum_threads').select(THREAD_COLUMNS).order('last_post_at', { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []) as Thread[];
}

export async function getThread(id: string): Promise<Thread | null> {
  await forumUser();
  const { data, error } = await db().from('forum_threads').select(THREAD_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Thread | null) ?? null;
}

export async function listPosts(threadId: string): Promise<Post[]> {
  await forumUser();
  const { data, error } = await db().from('forum_posts').select(POST_COLUMNS).eq('thread_id', threadId).order('created_at', { ascending: true }).limit(300);
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function createThread(input: { title: string; body: string; name: string }): Promise<Thread> {
  await forumUser();
  const { data, error } = await db()
    .from('forum_threads')
    .insert({ title: cleanLine(input.title), body: cleanBody(input.body), author_name: displayName(input.name) })
    .select(THREAD_COLUMNS)
    .single();
  if (error) throw error;
  return data as Thread;
}

export async function createPost(input: { threadId: string; body: string; name: string }): Promise<Post> {
  await forumUser();
  const { data, error } = await db()
    .from('forum_posts')
    .insert({ thread_id: input.threadId, body: cleanBody(input.body), author_name: displayName(input.name) })
    .select(POST_COLUMNS)
    .single();
  if (error) throw error;
  return data as Post;
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await db().from('forum_threads').delete().eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await db().from('forum_posts').delete().eq('id', id);
  if (error) throw error;
}

/** Flags a thread or a reply for the forum's owner to look at. */
export async function report(target: { threadId?: string; postId?: string }, reason = ''): Promise<void> {
  await forumUser();
  const { error } = await db()
    .from('forum_reports')
    .insert({ thread_id: target.threadId ?? null, post_id: target.postId ?? null, reason: cleanLine(reason).slice(0, 300) });
  if (error) throw error;
}

/** Calls back with each new reply in a thread while it is open. Returns a function that stops listening. */
export function watchPosts(threadId: string, onPost: (post: Post) => void): () => void {
  if (!forumConfigured) return () => {};
  const channel = db()
    .channel(`forum-posts-${threadId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${threadId}` }, (payload) =>
      onPost(payload.new as Post)
    )
    .subscribe();
  return () => {
    void db().removeChannel(channel);
  };
}
