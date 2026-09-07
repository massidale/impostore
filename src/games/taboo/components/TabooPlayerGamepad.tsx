import { TurnTimer } from '../../../core/components/TurnTimer';
import { FitContent } from '../../../core/ui/FitContent';
import { wrappingText } from '../../../core/ui/wrappingText';
import { useGameViewport } from '../../../core/hooks/useGameViewport';
import { useGameAction } from '../../../core/hooks/useGameAction';
import { retryAction } from '../../../core/services/retryAction';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  ErrorBanner,
  ForbiddenIcon,
  MetaRow,
  StatusCard,
  TrophyIcon,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { TabooCard, TabooGameState, TeamId } from '../types';
import {
  beginTabooTurn,
  endTabooTurn,
  resolveTabooCard,
  undoTabooCard,
} from '../services/tabooLogic';

const TEAM_LABEL: Record<TeamId, string> = {
  blue: 'Squadra Blu',
  red: 'Squadra Rossa',
};


const TEAM_COLOR: Record<TeamId, string> = {
  blue: colors.teamBlue,
  red: colors.teamRed,
};


function playerName(roomData: PlayerGamepadProps['roomData'], uid?: string | null): string {
  if (!uid) return 'Giocatore';
  return roomData.players?.[uid]?.name || 'Giocatore';
}

// ── Taboo card ──

function TabooCardView({ card, team, compact }: { card: TabooCard; team: TeamId; compact: boolean }) {
  return (
    <View testID="taboo-card" style={[styles.tabooCard, { borderColor: TEAM_COLOR[team] }]}>
      <View style={[styles.tabooCardHeader, compact && {paddingVertical: spacing.sm, paddingHorizontal: spacing.md}, { backgroundColor: TEAM_COLOR[team] }]}>
        <Text style={[styles.tabooCardWord, compact && {fontSize: 28}]}>
          {card.word}
        </Text>
      </View>
      <View style={[styles.tabooCardBody, compact && {paddingHorizontal: spacing.md, paddingVertical: spacing.xs}]}>
        {card.taboo.map((t, i) => (
          <View key={`${t}-${i}`} style={[styles.tabooRow, compact && {paddingVertical: spacing.xs + 2, gap: spacing.sm}, i > 0 && styles.tabooRowDivider]}>
            <ForbiddenIcon size={14} color={colors.danger} />
            <Text style={[styles.tabooWord, compact && {fontSize: 18}]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main gamepad ──

export default function TabooPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const {onLayout, compact} = useGameViewport();
  const gameState = roomData.gameState as TabooGameState;
  const roomId = roomData.id;
  const {error, runAction} = useGameAction();
  const playerCount = Object.keys(roomData.players ?? {}).length;
  const metaRow = <><MetaRow roomId={roomId} players={playerCount} />{error ? <ErrorBanner message={error} /> : null}</>;

  const myTeam: TeamId | undefined = gameState.teams?.[playerId];
  const currentTeam = gameState.currentTeam ?? 'blue';
  const describerUid = gameState.describerUid;
  const isDescriber = describerUid === playerId;
  const totalTurns = (gameState.turnsPerTeam ?? 0) * 2;
  const turnLabel = `Turno ${Math.min((gameState.turnNumber ?? 0) + 1, totalTurns)}/${totalTurns}`;

  const remaining = useCountdown(gameState.phase === 'turn' ? gameState.turnEndsAt : null);

  // The describer's client is responsible for closing the turn when the
  // timer hits zero (endTabooTurn is idempotent — duplicates are harmless).
  useEffect(() => {
    if (gameState.phase !== 'turn' || !isDescriber || remaining !== 0) return;
    return retryAction(() => endTabooTurn(roomId));
  }, [gameState.phase, isDescriber, remaining, roomId]);

  if (!roomData.players?.[playerId]) return null;

  // ── Waiting for the host to start ──
  if (gameState.phase === 'setup' || !gameState.teams) {
    return (
      <View onLayout={onLayout} style={[styles.container, compact && styles.compactContainer]}>
        {metaRow}
        <Text style={{ color: colors.textSecondary }}>{turnLabel}</Text>
        <FitContent>
          <StatusCard
            title="In attesa..."
            message="L'host non ha ancora avviato la partita."
          />
        </FitContent>
      </View>
    );
  }

  // Joined mid-game without a team: spectate until the next match.
  if (!myTeam && gameState.phase !== 'results') {
    return (
      <View onLayout={onLayout} style={[styles.container, compact && styles.compactContainer]}>
        {metaRow}
        <Text style={{ color: colors.textSecondary }}>{turnLabel}</Text>
        <FitContent>
          <StatusCard
            title="Partita in corso"
            message="Non fai parte di una squadra in questo round. Entrerai alla prossima partita."
            tone="muted"
          />
        </FitContent>
      </View>
    );
  }

  // ── Between turns ──
  if (gameState.phase === 'ready') {
    const describerName = playerName(roomData, describerUid);
    const last = gameState.lastTurn;

    return (
      <View onLayout={onLayout} style={[styles.container, compact && styles.compactContainer]}>

        <FitContent>
          {last ? (
            <View style={styles.lastTurnBanner}>
              <Text style={styles.lastTurnText}>
                Turno precedente ({TEAM_LABEL[last.team]}):{'\n'}
                <Text style={styles.lastTurnStat}>{last.correct} indovinate</Text>
                {'\n'}
                <Text style={styles.lastTurnStat}>{last.taboo} tabù</Text>
                {'\n'}
                <Text style={styles.lastTurnStat}>{last.skipped} passate</Text>
              </Text>
            </View>
          ) : null}

          <View style={[styles.readyCard, { borderColor: TEAM_COLOR[currentTeam] }]}>
            <Text style={[styles.readyTeam, { color: TEAM_COLOR[currentTeam] }]}>
              Tocca alla {TEAM_LABEL[currentTeam]}
            </Text>
            <Text style={styles.readyDescriber}>
              {isDescriber ? 'Descrivi tu!' : `Descrive ${describerName}`}
            </Text>

            {isDescriber ? (
              <>
                <Text style={styles.readyHint}>
                  Fai indovinare più parole possibile alla tua squadra senza
                  usare le parole vietate. Gli avversari ti controllano!
                </Text>
                <Button
                  onPress={() => runAction(() => beginTabooTurn(roomId))}
                  variant="primary"
                  size="lg"
                  style={{ marginTop: spacing.lg }}
                >
                  Inizia il turno ({gameState.turnSeconds}s)
                </Button>
              </>
            ) : (
              <Text style={styles.readyHint}>
                {gameState.teams?.[describerUid ?? ''] === myTeam
                  ? 'Preparati a indovinare le parole che descriverà.'
                  : 'Vedrai la sua carta: se dice una parola vietata, dillo a voce.'}
              </Text>
            )}
          </View>

          {myTeam ? (
            <Text style={styles.myTeamLine}>
              Sei nella <Text style={{ color: TEAM_COLOR[myTeam], fontFamily: fonts.displayHeavy }}>{TEAM_LABEL[myTeam]}</Text>
            </Text>
          ) : null}
        </FitContent>

        <MetaRow roomId={roomId} players={playerCount} style={styles.bottomMeta} />
      </View>
    );
  }

  // ── Active turn ──
  if (gameState.phase === 'turn') {
    const card = gameState.currentCard ?? null;
    const seconds = remaining ?? gameState.turnSeconds;
    const isMyTeamTurn = myTeam === currentTeam;
    const seesCard = isDescriber || !isMyTeamTurn;
    const maxSkips = gameState.maxSkips ?? 3;
    const skipsLeft = Math.max(0, maxSkips - (gameState.turnStats?.skipped ?? 0));
    const canUndo = !!gameState.lastAction;

    // The card wraps at the available width and scales into the space
    // between the timer and actions, including when host controls are open.
    return (
      <View onLayout={onLayout} style={[styles.container, compact && styles.compactContainer]}>

        <TurnTimer seconds={seconds} total={gameState.turnSeconds}
          onUndo={isDescriber && canUndo ? () => runAction(() => undoTabooCard(roomId)) : undefined} />

        <FitContent testID="taboo-turn-card" minContentWidth={400}>
          {isDescriber && card ? (
            <TabooCardView card={card} team={currentTeam} compact={compact} />
          ) : seesCard && card ? (
            <>
              <Text style={styles.watcherLabel}>
                {playerName(roomData, describerUid)} sta descrivendo per la {TEAM_LABEL[currentTeam]}
              </Text>
              <TabooCardView card={card} team={currentTeam} compact={compact} />
              <Text style={styles.buzzHint}>
                Se dice una parola vietata, dillo a voce: la segna{' '}
                {playerName(roomData, describerUid)}.
              </Text>
            </>
          ) : (
            <View style={styles.guesserBox}>
              <Text style={[styles.guesserTitle, { color: TEAM_COLOR[currentTeam] }]}>
                INDOVINA!
              </Text>
              <Text style={styles.guesserHint}>
                {playerName(roomData, describerUid)} sta descrivendo una parola:
                grida la risposta a voce!
              </Text>
            </View>
          )}
        </FitContent>

        {isDescriber && card ? (
          <View style={[styles.describerActions, compact && styles.compactActions]}>
            <Button onPress={() => runAction(() => resolveTabooCard(roomId, 'correct'))} variant="success" size={compact ? "sm" : "lg"} style={compact ? {flex: 1} : undefined}>
              Indovinata
            </Button>
            <View style={[styles.describerSecondaryRow, compact && {flex: 2}]}>
              <Button
                onPress={() => runAction(() => resolveTabooCard(roomId, 'skip'))}
                variant="secondary"
                size={compact ? "sm" : "md"}
                disabled={skipsLeft === 0}
                style={{ flex: 1 }}
              >
                {`Passa (${skipsLeft})`}
              </Button>
              <Button
                onPress={() => runAction(() => resolveTabooCard(roomId, 'taboo'))}
                variant="dangerMuted"
                size={compact ? "sm" : "md"}
                style={{ flex: 1 }}
              >
                Tabù
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Results ──
  if (gameState.phase === 'results') {
    const accent = colors.primary;
    const title = 'Partita conclusa!';

    return (
      <View onLayout={onLayout} style={[styles.container, compact && styles.compactContainer]}>
        {metaRow}
        <Text style={{ color: colors.textSecondary }}>{turnLabel}</Text>
        <FitContent>
          <View style={[styles.resultsCard, { borderColor: accent }]}>
            <View style={styles.resultsHeader}>
              <TrophyIcon size={14} color={accent} />
              <Text style={[styles.resultsLabel, { color: accent }]}>FINE PARTITA</Text>
            </View>

            <Text style={[styles.resultsTitle, { color: accent }]}>{title}</Text>

          </View>
        </FitContent>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  compactContainer: {padding: spacing.sm},
  compactActions: {flexDirection: 'row'},
  container: {
    minHeight: 0,
    minWidth: 0,
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  // Ready phase
  lastTurnBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  lastTurnText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  lastTurnStat: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
  },
  readyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.xl,
    alignItems: 'center',
  },
  readyTeam: {
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  readyDescriber: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  readyHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  myTeamLine: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  bottomMeta: {
    marginBottom: 0,
    marginTop: spacing.md,
  },

  tabooCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tabooCardHeader: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  tabooCardWord: {
    ...wrappingText,
    width: '100%',
    color: '#FFFFFF',
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xxl,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tabooCardBody: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  tabooRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tabooRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabooWord: {
    ...wrappingText,
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.lg,
    letterSpacing: 0.3,
  },
  describerActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  describerSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  watcherLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buzzHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  guesserBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  guesserTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 40,
    letterSpacing: 2,
    textAlign: 'center',
  },
  guesserHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Results
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.xl,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
  },
  resultsLabel: {
    fontFamily: fonts.displayHeavy,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultsTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
});
