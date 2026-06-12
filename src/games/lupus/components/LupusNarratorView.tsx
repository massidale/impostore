import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  CountdownBar,
  PhaseCard,
  SectionHeader,
  colors,
  confirmDialog,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { LupusGameState, LupusNightState, LupusRole } from '../types';
import { ABSTAIN } from '../services/lupusPure';
import {
  narratorCloseNightPoll,
  narratorCloseVotePoll,
  narratorSetAlive,
  narratorStartNightPoll,
  narratorStartVotePoll,
} from '../services/lupusLogic';

const ROLE_LABEL: Record<LupusRole, string> = {
  lupo: 'Lupo',
  villico: 'Villico',
  veggente: 'Veggente',
  guardia: 'Guardia',
  medium: 'Medium',
  bocca: 'Bocca di Rosa',
};

const ROLE_COLOR: Record<LupusRole, string> = {
  lupo: colors.roleImpostor,
  villico: colors.roleCivilian,
  veggente: colors.primaryLight,
  guardia: colors.warning,
  medium: '#A78BFA',
  bocca: '#EC4899',
};

// Minimal monochrome glyphs: Unicode crosses render as colored emoji on
// iOS, breaking the console's style — so both life toggles are SVG.
const DeadIcon = ({ size = 16, color = colors.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v18M6 9h12"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

const ReviveIcon = ({ size = 16, color = colors.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 11a8 8 0 1 1 2.3 6.3M4 11V5m0 6h6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface LupusNarratorViewProps {
  roomData: PlayerGamepadProps['roomData'];
  gameState: LupusGameState;
}

function name(roomData: PlayerGamepadProps['roomData'], uid?: string | null): string {
  if (!uid) return '—';
  return roomData.players?.[uid]?.name || 'Giocatore';
}

/**
 * Game-master console. The app applies NOTHING here: it deals the cards,
 * runs optional polls (night & day) and reports what happened. Killing,
 * narrating and declaring winners is the narrator's job — the ✝/↺ toggles
 * are bookkeeping for what HE decides.
 */
export default function LupusNarratorView({ roomData, gameState }: LupusNarratorViewProps) {
  const roomId = roomData.id;
  const roles = gameState.roles ?? {};
  const customRoles = gameState.customRoles ?? {};
  const alive = gameState.alive ?? {};
  const night = gameState.night ?? {};
  const votes = gameState.votes ?? {};

  const nightRemaining = useCountdown(
    gameState.phase === 'night' ? gameState.nightEndsAt : null
  );
  const voteRemaining = useCountdown(
    gameState.phase === 'voting' ? gameState.votingEndsAt : null
  );

  // The narrator's device closes expired polls automatically — the result
  // is only a report, so an auto-close never decides anything.
  const closingRef = useRef(false);
  useEffect(() => {
    const expired =
      (gameState.phase === 'night' && nightRemaining === 0) ||
      (gameState.phase === 'voting' && voteRemaining === 0);
    if (!expired || closingRef.current) return;
    closingRef.current = true;
    const close =
      gameState.phase === 'night'
        ? narratorCloseNightPoll(roomId)
        : narratorCloseVotePoll(roomId);
    close
      .catch(() => {})
      .finally(() => {
        closingRef.current = false;
      });
  }, [gameState.phase, nightRemaining, voteRemaining, roomId]);

  const handleToggleAlive = async (uid: string) => {
    const isAlive = alive[uid] !== false;
    const ok = await confirmDialog({
      title: isAlive ? 'Segnare come morto?' : 'Riportare in vita?',
      message: `${name(roomData, uid)} verrà segnato come ${isAlive ? 'morto' : 'vivo'}. Decidi tu: l'app prende solo nota.`,
      confirmLabel: isAlive ? 'Segna morto' : 'Segna vivo',
      destructive: isAlive,
    });
    if (ok) narratorSetAlive(roomId, uid, !isAlive);
  };

  const nightReportLines = (report: LupusNightState | null | undefined) => {
    if (!report) return null;
    const lupoVotes = report.lupoVotes ?? {};
    return (
      <>
        {Object.keys(lupoVotes).length === 0 ? (
          <Text style={styles.reportLine}>🐺 I lupi non hanno scelto (astenuti).</Text>
        ) : (
          Object.entries(lupoVotes).map(([lupo, target]) => (
            <Text key={lupo} style={styles.reportLine}>
              🐺 {name(roomData, lupo)} → {name(roomData, target)}
            </Text>
          ))
        )}
        {report.protectDone ? (
          <Text style={styles.reportLine}>
            🛡️ Guardia protegge {name(roomData, report.protectTarget)}
          </Text>
        ) : null}
        {report.seerDone ? (
          <Text style={styles.reportLine}>
            🔮 Veggente scruta {name(roomData, report.seerTarget)}
          </Text>
        ) : null}
        {report.boccaDone ? (
          <Text style={styles.reportLine}>
            💋 Bocca di Rosa da {name(roomData, report.boccaTarget)}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.narratorBadge}>🎙️ NARRATORE</Text>
        <Text style={styles.roundLabel}>Round {gameState.round ?? 1}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Poll controls ── */}
        {gameState.phase === 'standby' ? (
          <PhaseCard
            title="Sondaggi"
            tone="cyan"
            compact
            description="Strumenti opzionali: raccolgono le scelte sui telefoni e ti riportano gli eventi. Decidi tu cosa succede."
          >
            <View style={styles.pollButtons}>
              <Button
                onPress={() => narratorStartNightPoll(roomId)}
                variant="primary"
                style={{ flex: 1 }}
              >
                Avvia notte
              </Button>
              <Button
                onPress={() => narratorStartVotePoll(roomId)}
                variant="warningMuted"
                style={{ flex: 1 }}
              >
                Avvia voto
              </Button>
            </View>
          </PhaseCard>
        ) : null}

        {gameState.phase === 'night' ? (
          <PhaseCard title="Notte in corso" tone="cyan" compact>
            {nightRemaining !== null ? (
              <CountdownBar
                seconds={nightRemaining}
                total={gameState.nightSeconds ?? 60}
                size="md"
                style={{ marginBottom: spacing.md }}
              />
            ) : null}
            {nightReportLines(night)}
            <Button
              onPress={() => narratorCloseNightPoll(roomId)}
              variant="secondary"
              style={{ marginTop: spacing.md }}
            >
              Chiudi notte
            </Button>
          </PhaseCard>
        ) : null}

        {gameState.phase === 'voting' ? (
          <PhaseCard title="Votazione in corso" tone="warning" compact>
            {voteRemaining !== null ? (
              <CountdownBar
                seconds={voteRemaining}
                total={gameState.votingSeconds ?? 90}
                size="md"
                style={{ marginBottom: spacing.md }}
              />
            ) : null}
            {Object.keys(votes).length === 0 ? (
              <Text style={styles.reportPending}>Nessun voto ancora.</Text>
            ) : (
              Object.entries(votes).map(([voter, target]) => (
                <Text key={voter} style={styles.reportLine}>
                  {name(roomData, voter)} →{' '}
                  {target === ABSTAIN ? 'astenuto' : name(roomData, target)}
                </Text>
              ))
            )}
            <Button
              onPress={() => narratorCloseVotePoll(roomId)}
              variant="secondary"
              style={{ marginTop: spacing.md }}
            >
              Chiudi votazione
            </Button>
          </PhaseCard>
        ) : null}

        {/* ── Reports of the last polls ── */}
        {gameState.phase === 'standby' && gameState.lastNightReport ? (
          <PhaseCard
            title="Eventi dell'ultima notte"
            tone="neutral"
            compact
            style={{ marginTop: spacing.md }}
          >
            {nightReportLines(gameState.lastNightReport)}
          </PhaseCard>
        ) : null}

        {gameState.phase === 'standby' && gameState.lastVoteReport ? (
          <PhaseCard
            title="Esito dell'ultimo voto"
            tone="neutral"
            compact
            style={{ marginTop: spacing.md }}
          >
            {Object.keys(gameState.lastVoteReport.votes ?? {}).length === 0 ? (
              <Text style={styles.reportPending}>Nessuno ha votato.</Text>
            ) : (
              Object.entries(gameState.lastVoteReport.votes ?? {}).map(([voter, target]) => (
                <Text key={voter} style={styles.reportLine}>
                  {name(roomData, voter)} →{' '}
                  {target === ABSTAIN ? 'astenuto' : name(roomData, target)}
                </Text>
              ))
            )}
          </PhaseCard>
        ) : null}

        {/* ── Role map + manual bookkeeping ── */}
        <SectionHeader
          label="Ruoli e stato"
          hint="Tocca l'icona a destra per segnare morti e vivi: decidi tu, l'app prende nota."
          style={{ marginTop: spacing.xl }}
        />
        <View style={styles.playersBlock}>
          {Object.entries(roles).map(([uid, role], i, arr) => {
            const isAlive = alive[uid] !== false;
            const custom = customRoles[uid];
            return (
              <View
                key={uid}
                style={[styles.playerRow, i < arr.length - 1 && styles.playerRowDivider]}
              >
                <Text
                  style={[styles.playerName, !isAlive && styles.playerNameDead]}
                  numberOfLines={1}
                >
                  {name(roomData, uid)}
                </Text>
                <Text
                  style={[
                    styles.playerRole,
                    { color: custom ? colors.textPrimary : ROLE_COLOR[role] },
                  ]}
                  numberOfLines={1}
                >
                  {custom ?? ROLE_LABEL[role]}
                </Text>
                <TouchableOpacity
                  onPress={() => handleToggleAlive(uid)}
                  style={styles.lifeButton}
                  accessibilityLabel={isAlive ? 'Segna morto' : 'Segna vivo'}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {isAlive ? <DeadIcon /> : <ReviveIcon />}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  narratorBadge: {
    color: colors.primaryLight,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
  },
  roundLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  pollButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reportLine: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  reportPending: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontStyle: 'italic',
  },
  playersBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  playerRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  playerName: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.md,
  },
  playerNameDead: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  playerRole: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
  },
  lifeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
