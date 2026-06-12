import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  CountdownBar,
  ForbiddenIcon,
  GhostButton,
  MetaRow,
  StatusCard,
  TrophyIcon,
  UndoIcon,
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

const TEAM_SHORT: Record<TeamId, string> = {
  blue: 'Blu',
  red: 'Rossa',
};

const TEAM_COLOR: Record<TeamId, string> = {
  blue: colors.teamBlue,
  red: colors.teamRed,
};

const TEAM_TINT: Record<TeamId, string> = {
  blue: colors.teamBlueTint,
  red: colors.teamRedTint,
};

function playerName(roomData: PlayerGamepadProps['roomData'], uid?: string | null): string {
  if (!uid) return 'Giocatore';
  return roomData.players?.[uid]?.name || 'Giocatore';
}

// ── Scoreboard ──

function ScoreBoard({
  scores,
  activeTeam,
  turnLabel,
}: {
  scores: { blue: number; red: number };
  activeTeam?: TeamId;
  turnLabel?: string;
}) {
  return (
    <View style={styles.scoreBoard}>
      <ScoreCell team="blue" score={scores.blue} active={activeTeam === 'blue'} />
      <View style={styles.scoreCenter}>
        <Text style={styles.scoreVs}>VS</Text>
        {turnLabel ? <Text style={styles.scoreTurn}>{turnLabel}</Text> : null}
      </View>
      <ScoreCell team="red" score={scores.red} active={activeTeam === 'red'} />
    </View>
  );
}

function ScoreCell({ team, score, active }: { team: TeamId; score: number; active: boolean }) {
  return (
    <View
      style={[
        styles.scoreCell,
        { backgroundColor: TEAM_TINT[team] },
        active && { borderColor: TEAM_COLOR[team] },
      ]}
    >
      <Text style={[styles.scoreTeam, { color: TEAM_COLOR[team] }]}>{TEAM_SHORT[team]}</Text>
      <Text style={styles.scoreValue}>{score}</Text>
    </View>
  );
}

// ── Taboo card ──

function TabooCardView({ card, team }: { card: TabooCard; team: TeamId }) {
  return (
    <View style={[styles.tabooCard, { borderColor: TEAM_COLOR[team] }]}>
      <View style={[styles.tabooCardHeader, { backgroundColor: TEAM_COLOR[team] }]}>
        <Text style={styles.tabooCardWord} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {card.word}
        </Text>
      </View>
      <View style={styles.tabooCardBody}>
        {card.taboo.map((t, i) => (
          <View key={`${t}-${i}`} style={[styles.tabooRow, i > 0 && styles.tabooRowDivider]}>
            <ForbiddenIcon size={14} color={colors.danger} />
            <Text style={styles.tabooWord}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main gamepad ──

export default function TabooPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const gameState = roomData.gameState as TabooGameState;
  const roomId = roomData.id;
  const playerCount = Object.keys(roomData.players ?? {}).length;
  const metaRow = <MetaRow roomId={roomId} players={playerCount} />;

  const scores = gameState.scores ?? { blue: 0, red: 0 };
  const myTeam: TeamId | undefined = gameState.teams?.[playerId];
  const currentTeam = gameState.currentTeam ?? 'blue';
  const describerUid = gameState.describerUid;
  const isDescriber = describerUid === playerId;
  const totalTurns = (gameState.turnsPerTeam ?? 0) * 2;
  const turnLabel = `Turno ${Math.min((gameState.turnNumber ?? 0) + 1, totalTurns)}/${totalTurns}`;

  const remaining = useCountdown(gameState.phase === 'turn' ? gameState.turnEndsAt : null);

  // The describer's client is responsible for closing the turn when the
  // timer hits zero (endTabooTurn is idempotent — duplicates are harmless).
  const endedRef = useRef(false);
  useEffect(() => {
    if (gameState.phase !== 'turn') {
      endedRef.current = false;
      return;
    }
    if (isDescriber && remaining === 0 && !endedRef.current) {
      endedRef.current = true;
      endTabooTurn(roomId).catch(() => {
        endedRef.current = false;
      });
    }
  }, [gameState.phase, isDescriber, remaining, roomId]);

  if (!roomData.players?.[playerId]) return null;

  // ── Waiting for the host to start ──
  if (gameState.phase === 'setup' || !gameState.teams) {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard
            title="In attesa..."
            message="L'host non ha ancora avviato la partita."
          />
        </View>
      </View>
    );
  }

  // Joined mid-game without a team: spectate until the next match.
  if (!myTeam && gameState.phase !== 'results') {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard
            title="Partita in corso"
            message="Non fai parte di una squadra in questo round. Entrerai alla prossima partita."
            tone="muted"
          />
        </View>
      </View>
    );
  }

  // ── Between turns ──
  if (gameState.phase === 'ready') {
    const describerName = playerName(roomData, describerUid);
    const last = gameState.lastTurn;

    return (
      <View style={styles.container}>
        <ScoreBoard scores={scores} activeTeam={currentTeam} turnLabel={turnLabel} />

        <View style={styles.centerGrow}>
          {last ? (
            <View style={styles.lastTurnBanner}>
              <Text style={styles.lastTurnText}>
                Turno precedente ({TEAM_LABEL[last.team]}):{' '}
                <Text style={styles.lastTurnStat}>{last.correct} indovinate</Text>
                {' · '}
                <Text style={styles.lastTurnStat}>{last.taboo} tabù</Text>
                {' · '}
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
                  onPress={() => beginTabooTurn(roomId)}
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
        </View>

        {/* Bottom placement: keeps the scoreboard header untouched. */}
        <MetaRow roomId={roomId} players={playerCount} style={styles.bottomMeta} />
      </View>
    );
  }

  // ── Active turn ──
  if (gameState.phase === 'turn') {
    const deck = gameState.deck ?? [];
    const card = deck.length > 0 ? deck[(gameState.cursor ?? 0) % deck.length] : null;
    const seconds = remaining ?? gameState.turnSeconds;
    const isMyTeamTurn = myTeam === currentTeam;
    const seesCard = isDescriber || !isMyTeamTurn;
    const maxSkips = gameState.maxSkips ?? 3;
    const skipsLeft = Math.max(0, maxSkips - (gameState.turnStats?.skipped ?? 0));
    const canUndo = !!gameState.lastAction;

    // Fixed layout: scores + timer on top, card centered, actions pinned to
    // the bottom. Nothing scrolls — card and buttons are always visible.
    return (
      <View style={styles.container}>
        <ScoreBoard scores={scores} activeTeam={currentTeam} turnLabel={turnLabel} />

        <View style={styles.timerRow}>
          <CountdownBar
            seconds={seconds}
            total={gameState.turnSeconds}
            size="sm"
            style={{ flex: 1 }}
          />
          {isDescriber && canUndo ? (
            <GhostButton
              onPress={() => undoTabooCard(roomId)}
              icon={<UndoIcon size={14} color={colors.textPrimary} />}
              style={styles.undoButton}
            >
              Annulla
            </GhostButton>
          ) : null}
        </View>

        <View style={styles.turnBody}>
          {isDescriber && card ? (
            <TabooCardView card={card} team={currentTeam} />
          ) : seesCard && card ? (
            <>
              <Text style={styles.watcherLabel}>
                {playerName(roomData, describerUid)} sta descrivendo per la {TEAM_LABEL[currentTeam]}
              </Text>
              <TabooCardView card={card} team={currentTeam} />
              <Text style={styles.buzzHint}>
                Se dice una parola vietata, dillo a voce: la segna{' '}
                {playerName(roomData, describerUid)} (−1 punto).
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
        </View>

        {isDescriber && card ? (
          <View style={styles.describerActions}>
            <Button onPress={() => resolveTabooCard(roomId, 'correct')} variant="success" size="lg">
              Indovinata
            </Button>
            <View style={styles.describerSecondaryRow}>
              <Button
                onPress={() => resolveTabooCard(roomId, 'skip')}
                variant="secondary"
                disabled={skipsLeft === 0}
                style={{ flex: 1 }}
              >
                {`Passa (${skipsLeft})`}
              </Button>
              <Button
                onPress={() => resolveTabooCard(roomId, 'taboo')}
                variant="dangerMuted"
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
  // Minimal recap, identical for every player: winning team + final scores.
  if (gameState.phase === 'results') {
    const winner =
      scores.blue > scores.red ? 'blue' : scores.red > scores.blue ? 'red' : 'tie';
    const accent = winner === 'tie' ? colors.warning : TEAM_COLOR[winner];
    const title =
      winner === 'tie'
        ? 'Pareggio!'
        : `Vince la ${TEAM_LABEL[winner]}`;

    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <View style={[styles.resultsCard, { borderColor: accent }]}>
            <View style={styles.resultsHeader}>
              <TrophyIcon size={14} color={accent} />
              <Text style={[styles.resultsLabel, { color: accent }]}>FINE PARTITA</Text>
            </View>

            <Text style={[styles.resultsTitle, { color: accent }]}>{title}</Text>

            <ScoreBoard scores={scores} activeTeam={winner === 'tie' ? undefined : winner} />
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
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
  centerGrow: {
    flex: 1,
    justifyContent: 'center',
  },

  // Scoreboard — compact single row: team + score side by side.
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scoreCell: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.xs + 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scoreTeam: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.md,
    lineHeight: fontSize.md + 4,
  },
  scoreCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  scoreVs: {
    color: colors.textMuted,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xs,
    letterSpacing: 1,
  },
  scoreTurn: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Timer + undo (describer) on one compact row
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  undoButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignSelf: 'auto',
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

  // Turn phase — fixed (non-scrolling) body between timer and actions
  turnBody: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
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
