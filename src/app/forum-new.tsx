import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { displayName, explain, LIMITS, threadProblem } from '@/forum/rules';
import { createThread } from '@/services/forum';
import { useGame } from '@/store/useGame';

export default function ForumNew() {
  const router = useRouter();
  const name = useGame((s) => s.data.profile.name);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = threadProblem(title, body);

  const post = async () => {
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const thread = await createThread({ title, body, name });
      router.replace({ pathname: '/forum-thread', params: { id: thread.id } });
    } catch (e) {
      setError(explain(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      title="New thread"
      subtitle={`Posting as ${displayName(name)}`}
      back
      footer={<Btn label={busy ? 'Posting…' : 'Post thread'} icon="send" disabled={busy || !!problem} onPress={post} />}>
      <Panel>
        <View style={styles.form}>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="What is it about?" maxLength={LIMITS.titleMax} returnKeyType="next" />
          <Field
            label="Post"
            value={body}
            onChangeText={setBody}
            placeholder="Say more…"
            maxLength={LIMITS.bodyMax}
            multiline
            style={styles.body}
            hint={`${body.length} / ${LIMITS.bodyMax}`}
          />
          {(error || (problem && (title.length > 0 || body.length > 0))) && (
            <Txt variant="caption" color="dim">
              {error ?? problem}
            </Txt>
          )}
        </View>
      </Panel>
      <Txt variant="caption" color="dim" center>
        Threads are public and show your player name. You can delete your own.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  body: { minHeight: 140, textAlignVertical: 'top' },
});
