import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Divider, Field } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { addPost, ago, bodyProblem, explain, LIMITS, Post, Thread } from '@/forum/rules';
import { useNow } from '@/hooks/useNow';
import { createPost, deletePost, deleteThread, forumConfigured, forumUser, getThread, listPosts, report, watchPosts } from '@/services/forum';
import { useForumPrefs } from '@/store/useForumPrefs';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

/** Name, time and the small menu shared by the opening post and every reply. */
function Entry({
  name,
  at,
  body,
  mine,
  now,
  onDelete,
  onReport,
  onMute,
}: {
  name: string;
  at: string;
  body: string;
  mine: boolean;
  now: number;
  onDelete: () => void;
  onReport: () => void;
  onMute: () => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.entry}>
      <View style={styles.entryHead}>
        <Txt variant="bodyStrong" color={mine ? 'accent' : 'text'} style={styles.flex} numberOfLines={1}>
          {mine ? `${name} (you)` : name}
        </Txt>
        <Txt variant="caption" color="dim">
          {ago(at, now)}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${name}'s post`} hitSlop={10} onPress={() => setOpen((v) => !v)}>
          <Icon name="dots-horizontal" size={20} color={colors.textDim} />
        </Pressable>
      </View>
      <Txt selectable>{body}</Txt>
      {open && (
        <View style={styles.menu}>
          {mine ? (
            <Btn label="Delete" icon="delete-outline" variant="danger" size="sm" onPress={onDelete} />
          ) : (
            <>
              <Btn label="Report" icon="flag-outline" variant="secondary" size="sm" onPress={onReport} />
              <Btn label="Mute player" icon="account-cancel" variant="secondary" size="sm" onPress={onMute} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function ForumThread() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = useGame((s) => s.data.profile.name);
  const blocked = useForumPrefs((s) => s.blocked);
  const now = useNow();
  const block = useForumPrefs((s) => s.block);

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!forumConfigured || !id) return;
    try {
      const [user, found, replies] = await Promise.all([forumUser(), getThread(id), listPosts(id)]);
      setError(null);
      setMe(user);
      setThread(found);
      setPosts(replies);
      setState(found ? 'ready' : 'missing');
    } catch (e) {
      setError(explain(e));
      setState('ready');
    }
  }, [id]);

  // Load on arrival, and again whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Replies from other players arrive while the thread is open.
  useEffect(() => {
    if (!id || state !== 'ready') return;
    return watchPosts(id, (post) => setPosts((now) => addPost(now, post)));
  }, [id, state]);

  const send = async () => {
    if (!id || bodyProblem(draft)) return;
    setSending(true);
    setError(null);
    try {
      const post = await createPost({ threadId: id, body: draft, name });
      setPosts((now) => addPost(now, post));
      setDraft('');
    } catch (e) {
      setError(explain(e));
    } finally {
      setSending(false);
    }
  };

  const guarded = async (work: () => Promise<void>, done?: string) => {
    setError(null);
    setNotice(null);
    try {
      await work();
      if (done) setNotice(done);
    } catch (e) {
      setError(explain(e));
    }
  };

  const mute = (author: string, who: string) =>
    confirm({
      title: `Mute ${who}?`,
      message: 'You will stop seeing their threads and replies on this device. You can unmute everyone from the forum list.',
      confirmLabel: 'Mute',
      onConfirm: () => {
        block(author);
        if (thread?.author === author) router.back();
      },
    });

  if (!forumConfigured || state === 'missing') {
    return (
      <Screen title="Thread" back>
        <Panel>
          <Txt color="dim">{forumConfigured ? 'This thread is gone. It may have been deleted.' : 'The forum is not connected in this build.'}</Txt>
        </Panel>
      </Screen>
    );
  }

  const visible = posts.filter((p) => !blocked.includes(p.author));

  return (
    <Screen
      title={thread?.title ?? 'Thread'}
      subtitle={thread ? `${visible.length} ${visible.length === 1 ? 'reply' : 'replies'}` : 'Loading…'}
      back
      footer={
        thread ? (
          <View style={styles.composer}>
            <Field
              label="Reply"
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a reply…"
              maxLength={LIMITS.bodyMax}
              multiline
              containerStyle={styles.flex}
              style={styles.draft}
            />
            <Btn label={sending ? '…' : 'Send'} icon="send" disabled={sending || !!bodyProblem(draft)} onPress={send} accessibilityLabel="Send reply" />
          </View>
        ) : undefined
      }>
      {(error || notice) && (
        <Panel>
          <Txt>{error ?? notice}</Txt>
        </Panel>
      )}

      {thread && (
        <Panel>
          <Entry
            name={thread.author_name}
            at={thread.created_at}
            body={thread.body}
            mine={thread.author === me}
            now={now}
            onDelete={() =>
              confirm({
                title: 'Delete this thread?',
                message: 'The thread and every reply in it are removed for everyone. This cannot be undone.',
                confirmLabel: 'Delete',
                danger: true,
                onConfirm: () =>
                  void guarded(async () => {
                    await deleteThread(thread.id);
                    router.back();
                  }),
              })
            }
            onReport={() => void guarded(() => report({ threadId: thread.id }), 'Reported. Thank you.')}
            onMute={() => mute(thread.author, thread.author_name)}
          />
        </Panel>
      )}

      {thread && (
        <Panel title="Replies" icon="reply">
          {visible.length === 0 ? (
            <Txt color="dim">No replies yet. Say something.</Txt>
          ) : (
            visible.map((post, i) => (
              <View key={post.id}>
                {i > 0 && <Divider />}
                <Entry
                  name={post.author_name}
                  at={post.created_at}
                  body={post.body}
                  mine={post.author === me}
                  now={now}
                  onDelete={() =>
                    void guarded(async () => {
                      await deletePost(post.id);
                      setPosts((list) => list.filter((p) => p.id !== post.id));
                    })
                  }
                  onReport={() => void guarded(() => report({ postId: post.id }), 'Reported. Thank you.')}
                  onMute={() => mute(post.author, post.author_name)}
                />
              </View>
            ))
          )}
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entry: { gap: 6, paddingVertical: 8 },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menu: { flexDirection: 'row', gap: 8, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  draft: { maxHeight: 110 },
});
