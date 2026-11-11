import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Btn } from '@/components/Btn';
import { confirm } from '@/components/Dialog';
import { QuestForm } from '@/components/QuestForm';
import { Screen } from '@/components/Screen';
import { useGame } from '@/store/useGame';

export default function QuestEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quest = useGame((s) => s.data.quests.find((q) => q.id === id && !q.archived));
  const updateQuest = useGame((s) => s.updateQuest);
  const archiveQuest = useGame((s) => s.archiveQuest);

  if (!quest) return <Redirect href="/quests" />;

  return (
    <Screen title="Edit quest" subtitle={quest.title} back>
      <QuestForm
        initial={{
          title: quest.title,
          description: quest.description,
          icon: quest.icon,
          points: quest.points,
          stat: quest.stat,
          category: quest.category,
          slot: quest.slot,
          repeat: quest.repeat,
        }}
        submitLabel="Save changes"
        onSubmit={(changes) => {
          updateQuest(quest.id, changes);
          router.back();
        }}
      />
      <Btn
        label="Remove from my quests"
        icon="trash-can-outline"
        variant="danger"
        onPress={() =>
          confirm({
            title: 'Remove this quest?',
            message: `"${quest.title}" leaves your board. Points you already earned from it stay.`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => {
              archiveQuest(quest.id);
              router.back();
            },
          })
        }
      />
    </Screen>
  );
}
