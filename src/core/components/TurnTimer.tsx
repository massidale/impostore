import React from 'react';
import { View } from 'react-native';
import { CountdownBar, GhostButton, UndoIcon, colors, spacing } from '../ui';

/** Taboo's compact timer and undo control, shared with other timed turns. */
export function TurnTimer({ seconds, total, onUndo }: { seconds: number; total: number; onUndo?: () => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
    <CountdownBar seconds={seconds} total={total} size="sm" style={{ flex: 1 }} />
    {onUndo && <GhostButton onPress={onUndo} icon={<UndoIcon size={14} color={colors.textPrimary} />}
      style={{ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, alignSelf: 'auto' }}>Annulla</GhostButton>}
  </View>;
}
