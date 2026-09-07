import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { avatarColor, avatarInitial } from '../ui/avatarColor';

interface Props {
  uid: string;
  name: string;
  children: ReactNode;
  accessibilityLabel?: string;
  wide?: boolean;
}

/** Compact identity shared by progress and revealed-answer cards. */
export function ParticipantTile({ uid, name, children, accessibilityLabel, wide = false }: Props) {
  return <View style={[styles.cell, wide && styles.wide]} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
    <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
      <Text style={styles.initial}>{avatarInitial(name)}</Text>
    </View>
    <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  cell: { flexBasis: '22%', flexGrow: 1, maxWidth: 104, minWidth: 0, alignItems: 'center', padding: spacing.sm, gap: spacing.xs, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: radius.md },
  wide: { flexBasis: '45%', maxWidth: '100%', backgroundColor: colors.surface },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.background, fontFamily: fonts.displayHeavy, fontSize: 14 },
  name: { width: '100%', textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
