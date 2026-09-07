import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing } from './theme';
import { NoticeBanner } from './NoticeBanner';
import { HostActionFooter } from './HostActionFooter';

interface HostDashboardShellProps {
  /** Game name shown as "Comandi host · {gameName}". */
  gameName: string;
  /** Right side of the status row (typically a ProgressCounter). */
  status?: ReactNode;
  /** Names of players who joined mid-game and wait for the next round. */
  waitingNames?: string[];
  /** Extra rows between the status row and the action footer. */
  children?: ReactNode;
  /** Host action buttons, laid out horizontally with flex:1 each. */
  actions?: ReactNode;
}

/**
 * Common chrome for every game's HostDashboard: top border, status row
 * with the game label, optional "waiting players" banner and the action
 * footer. Keeps the host strip identical across games.
 */
export function HostDashboardShell({
  gameName,
  status,
  waitingNames,
  children,
  actions,
}: HostDashboardShellProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Comandi host · {gameName}</Text>
        {status}
      </View>

      {waitingNames && waitingNames.length > 0 ? (
        <NoticeBanner
          badge="In attesa"
          message={waitingNames.join(', ')}
          tone="warning"
          style={styles.banner}
        />
      ) : null}

      {children}

      {actions ? <HostActionFooter>{actions}</HostActionFooter> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // Same bottom gap as the Sheet footer (screens anchor to the physical
    // bottom edge — see core/ui/Screen.tsx).
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusRow: {
    flexWrap: 'wrap',
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  banner: {
    marginBottom: spacing.sm,
  },
});
