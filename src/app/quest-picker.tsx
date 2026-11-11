import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Divider, IconTile, Segmented } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { BLANK_QUEST, QuestForm } from '@/components/QuestForm';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { CATEGORY_INFO, CATEGORY_ORDER, QUEST_CATALOG } from '@/data/questCatalog';
import { QuestCategory, STAT_INFO } from '@/game/types';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'catalog' | 'custom';

export default function QuestPicker() {
  const { colors } = useTheme();
  const router = useRouter();
  const quests = useGame((s) => s.data.quests);
  const addQuest = useGame((s) => s.addQuest);
  const addQuestFromTemplate = useGame((s) => s.addQuestFromTemplate);
  const [mode, setMode] = useState<Mode>('catalog');
  const [category, setCategory] = useState<QuestCategory>('body');

  const added = new Set(quests.filter((q) => !q.archived && q.templateId).map((q) => q.templateId));
  const templates = QUEST_CATALOG.filter((t) => t.category === category);

  return (
    <Screen title="Add quests" subtitle="Pick from the catalog or write your own" back>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'catalog', label: 'Catalog', icon: 'view-grid' },
          { value: 'custom', label: 'Custom', icon: 'pencil' },
        ]}
      />

      {mode === 'catalog' ? (
        <>
          <Segmented<QuestCategory>
            wrap
            value={category}
            onChange={setCategory}
            options={CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_INFO[c].name, icon: CATEGORY_INFO[c].icon }))}
          />
          <Panel title={CATEGORY_INFO[category].name} icon={CATEGORY_INFO[category].icon}>
            {templates.map((template, i) => {
              const has = added.has(template.id);
              return (
                <View key={template.id}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <IconTile icon={template.icon} color={colors.accent} dim={has} />
                    <View style={styles.text}>
                      <Txt variant="bodyStrong">{template.title}</Txt>
                      <Txt variant="caption" color="dim">
                        {template.description}
                      </Txt>
                      <Txt variant="label" size={10} color="accent">{`${template.points} AP · ${STAT_INFO[template.stat].name}`}</Txt>
                    </View>
                    <Btn
                      label={has ? 'Added' : 'Add'}
                      icon={has ? 'check' : 'plus'}
                      size="sm"
                      variant={has ? 'secondary' : 'primary'}
                      disabled={has}
                      onPress={() => addQuestFromTemplate(template)}
                      accessibilityLabel={has ? `${template.title} added` : `Add ${template.title}`}
                    />
                  </View>
                </View>
              );
            })}
          </Panel>
        </>
      ) : (
        <QuestForm
          initial={BLANK_QUEST}
          submitLabel="Create quest"
          onSubmit={(quest) => {
            addQuest(quest);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  text: { flex: 1, gap: 2 },
});
