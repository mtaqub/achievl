import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Divider, Field } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { SOCIAL_NETWORKS, SocialNetwork } from '@/services/socials';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

function NetworkRow({ network }: { network: SocialNetwork }) {
  const { colors } = useTheme();
  const saved = useGame((s) => s.data.socials[network.id] ?? '');
  const setSocial = useGame((s) => s.setSocial);
  const [draft, setDraft] = useState(saved);
  const commit = () => {
    const clean = draft.trim().replace(/^@+/, '');
    if (clean !== draft) setDraft(clean);
    if (clean !== saved) setSocial(network.id, clean);
  };
  const link = saved && network.url ? network.url(saved) : null;

  return (
    <View style={styles.row}>
      <Icon name={network.icon} size={26} color={saved ? colors.accent : colors.textDim} style={styles.icon} />
      <Field
        label={network.name}
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        onBlur={commit}
        placeholder={network.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={40}
        returnKeyType="done"
        containerStyle={styles.field}
      />
      {link && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${network.name} profile`}
          hitSlop={10}
          onPress={() => Linking.openURL(link).catch(() => {})}
          style={styles.open}>
          <Icon name="open-in-new" size={22} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

export default function Socials() {
  return (
    <Screen title="Linked accounts" subtitle="Shown on your card and in what you share" back>
      <Txt variant="caption" color="dim">
        Type a handle and it saves when you leave the field. Clear it to unlink. Handles stay on this device until you share your card.
      </Txt>
      <Panel title="Accounts" icon="account-multiple">
        {SOCIAL_NETWORKS.map((network, i) => (
          <View key={network.id}>
            {i > 0 && <Divider />}
            <NetworkRow network={network} />
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 10 },
  icon: { marginBottom: 10 },
  field: { flex: 1 },
  open: { marginBottom: 11 },
});
