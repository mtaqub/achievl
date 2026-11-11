import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Divider, Row } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ago, explain, Thread } from '@/forum/rules';
import { useNow } from '@/hooks/useNow';
import { forumConfigured, listThreads } from '@/services/forum';
import { useForumPrefs } from '@/store/useForumPrefs';
import { useTheme } from '@/theme/ThemeProvider';

export default function Forum() {
  const { colors } = useTheme();
  const router = useRouter();
  const blocked = useForumPrefs((s) => s.blocked);
  const now = useNow();
  const unblockAll = useForumPrefs((s) => s.unblockAll);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!forumConfigured) return;
    setLoading(true);
    setError(null);
    try {
      setThreads(await listThreads());
    } catch (e) {
      setError(explain(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every time the screen comes back into view, e.g. after posting.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!forumConfigured) {
    return (
      <Screen title="Forum" subtitle="Offline in this build" back>
        <Panel title="Not connected yet" icon="lan-disconnect">
          <Txt color="dim">The forum needs a server, and this build has not been pointed at one. Everything else in Achievl works without it.</Txt>
        </Panel>
      </Screen>
    );
  }

  const visible = (threads ?? []).filter((t) => !blocked.includes(t.author));

  return (
    <Screen
      title="Forum"
      subtitle="Talk quests, food and streaks"
      back
      right={<Btn label="New" icon="plus" size="sm" onPress={() => router.push('/forum-new')} accessibilityLabel="Start a new thread" />}>
      {error && (
        <Panel>
          <View style={styles.block}>
            <Txt>{error}</Txt>
            <Btn label="Try again" icon="refresh" variant="secondary" size="sm" onPress={load} />
          </View>
        </Panel>
      )}

      <Panel
        title="Threads"
        icon="forum"
        right={
          <Txt variant="heading" size={14} color={colors.headerText}>
            {threads ? `${visible.length}` : ''}
          </Txt>
        }>
        {threads === null ? (
          <Txt color="dim">{loading ? 'Loading…' : 'Nothing loaded yet.'}</Txt>
        ) : visible.length === 0 ? (
          <View style={styles.block}>
            <Txt color="dim">No threads yet. Start the first one.</Txt>
            <Btn label="Start a thread" icon="plus" onPress={() => router.push('/forum-new')} />
          </View>
        ) : (
          visible.map((thread, i) => (
            <View key={thread.id}>
              {i > 0 && <Divider />}
              <Row
                icon="message-text"
                title={thread.title}
                subtitle={`${thread.author_name} · ${ago(thread.last_post_at, now)} · ${thread.reply_count} ${thread.reply_count === 1 ? 'reply' : 'replies'}`}
                onPress={() => router.push({ pathname: '/forum-thread', params: { id: thread.id } })}
                right={<Icon name="chevron-right" size={24} color={colors.textDim} />}
                accessibilityLabel={`Open thread: ${thread.title}`}
              />
            </View>
          ))
        )}
      </Panel>

      <View style={styles.row}>
        <Btn label={loading ? 'Loading…' : 'Refresh'} icon="refresh" variant="ghost" size="sm" disabled={loading} onPress={load} />
        {blocked.length > 0 && (
          <Btn
            label={`Unmute ${blocked.length}`}
            icon="account-check"
            variant="ghost"
            size="sm"
            onPress={unblockAll}
            accessibilityLabel="Unmute everyone you muted"
          />
        )}
      </View>

      <Txt variant="caption" color="dim" center>
        Posts are public and carry your player name. Be kind; report anything that is not.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
});
