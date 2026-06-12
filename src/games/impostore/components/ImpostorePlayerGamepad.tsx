import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  CheckIcon,
  CountdownBar,
  EyeOffIcon,
  GhostButton,
  InlineConfirm,
  MetaCorner,
  PhaseCard,
  PlayerSlot,
  ProgressCounter,
  StatusCard,
  TrophyIcon,
  WordBox,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { ImpostoreGameState, ImpostorePlayerState, PlayerRole } from '../types';
import { markPlayerAsRevealed, castVote, submitImpostorGuess } from '../services/impostoreLogic';

function roleLabel(role: PlayerRole): string {
  if (role === 'impostor') return 'Impostore';
  if (role === 'clown') return 'Pagliaccio';
  if (role === 'civilian') return 'Civile';
  return '';
}

function roleColor(role: PlayerRole): string {
  if (role === 'impostor') return colors.roleImpostor as string;
  if (role === 'clown') return colors.roleClown as string;
  if (role === 'civilian') return colors.roleCivilian as string;
  return colors.textPrimary as string;
}

function roleDescription(role: PlayerRole, hasWord: boolean): string {
  if (role === 'civilian') {
    return 'Questa è la parola segreta per questo round. Cerca di essere convincente senza rivelarla. Istruisci gli altri con astuzia.';
  }
  if (role === 'clown') {
    return 'Conosci la parola come i civili, ma vinci solo se vieni eliminato tu. Fatti sospettare senza farti smascherare subito.';
  }
  if (role === 'impostor') {
    if (hasWord) {
      return 'Questo è il tuo unico indizio. Devi mescolarti tra i civili e scoprire la parola segreta senza farti scoprire.';
    }
    return 'Non conosci la parola. Ascolta gli altri, parla in modo vago e cerca di non farti smascherare.';
  }
  return '';
}

interface IconProps {
  size?: number;
  color?: string;
}

const CivilianIcon = ({ size = 64, color = colors.roleCivilian }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
    <Path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ImpostorIcon = ({ size = 64, color = colors.roleImpostor }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 8c0-1 .7-2 2-2h14c1.3 0 2 1 2 2v3c0 3-2 5-5 5-1.5 0-2.8-.6-3.6-1.7L12 13l-.4.6C10.8 14.7 9.5 15.3 8 15.3c-3 0-5-2-5-5V8z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Circle cx={8} cy={10} r={1} fill={color} />
    <Circle cx={16} cy={10} r={1} fill={color} />
  </Svg>
);

const ClownIcon = ({ size = 64, color = colors.roleClown }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 11l6-8 6 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={3} r={0.8} fill={color} />
    <Circle cx={12} cy={15} r={6} stroke={color} strokeWidth={2} />
    <Circle cx={9.5} cy={14} r={0.8} fill={color} />
    <Circle cx={14.5} cy={14} r={0.8} fill={color} />
    <Path d="M9.5 17.5c.8 1 1.5 1.2 2.5 1.2s1.7-.2 2.5-1.2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const DaggerIcon = ({ size = 28, color = colors.textMuted }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L10 15h4L12 2z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill={color} fillOpacity={0.18} />
    <Path d="M7 15h10" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M11 15v5h2v-5" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    <Circle cx={12} cy={21.5} r={1} stroke={color} strokeWidth={1.2} fill="none" />
  </Svg>
);

const ShieldIcon = ({ size = 28, color = colors.textMuted }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5L12 2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.12}
    />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MaskIcon = ({ size = 28, color = colors.textMuted }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9c0-2 1.5-3 3.5-3h11c2 0 3.5 1 3.5 3v2.5c0 3-2 5-5 5-1.6 0-2.8-.8-3.5-2h-2c-.7 1.2-1.9 2-3.5 2-3 0-5-2-5-5V9z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.15}
    />
    <Circle cx={8} cy={11} r={0.9} fill={color} />
    <Circle cx={16} cy={11} r={0.9} fill={color} />
  </Svg>
);

function VotingTimer({
  endsAt,
  totalSeconds,
}: {
  endsAt?: number | null;
  totalSeconds: number;
}) {
  const remaining = useCountdown(endsAt ?? null);
  if (remaining === null) return null;
  return <CountdownBar seconds={remaining} total={totalSeconds} size="md" style={{ marginBottom: spacing.md }} />;
}

function RoleIcon({ role, size }: { role: PlayerRole; size?: number }) {
  const color = roleColor(role);
  if (role === 'civilian') return <CivilianIcon size={size} color={color} />;
  if (role === 'impostor') return <ImpostorIcon size={size} color={color} />;
  if (role === 'clown') return <ClownIcon size={size} color={color} />;
  return (
    <Svg width={size || 64} height={size || 64} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={12} rx={10} ry={10} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export default function ImpostorePlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const gameState = roomData.gameState as ImpostoreGameState;
  const roomId = roomData.id;
  const playerState = roomData.players?.[playerId] as ImpostorePlayerState;

  const [showRole, setShowRole] = useState(false);
  const [guessText, setGuessText] = useState('');
  // Vote awaiting the inline ✓/✕ confirmation.
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  const handleReveal = () => {
    setShowRole(true);
    if (!playerState?.revealed) {
      markPlayerAsRevealed(roomId, playerId);
    }
  };

  const handleVote = async (targetUid: string) => {
    if (gameState.phase !== 'voting') return;
    if (targetUid === playerId) return;
    await castVote(roomId, playerId, targetUid);
  };

  const handleSubmitGuess = async () => {
    if (!guessText.trim()) return;
    await submitImpostorGuess(roomId, guessText.trim());
  };

  if (!playerState) return null;

  const playerCount = Object.keys(roomData.players || {}).length;
  const readyCount = Object.values(roomData.players || {}).filter(
    (p) => (p as ImpostorePlayerState).revealed
  ).length;

  // ── Playing Phase ──
  if (gameState.phase === 'playing') {
    const role = playerState.role;
    const hasHint = role === 'impostor' && gameState.hint;
    const shouldShowHint =
      hasHint && (!gameState.hintOnlyFirst || playerState.isFirst);

    const displayWord =
      role !== 'impostor'
        ? gameState.word
        : shouldShowHint
          ? gameState.hint
          : null;

    const wordLabel =
      role !== 'impostor' ? 'La parola' : shouldShowHint ? "L'indizio" : null;

    const firstPlayerId = gameState.firstPlayerId;
    const firstPlayerName =
      firstPlayerId && roomData.players?.[firstPlayerId]?.name
        ? roomData.players[firstPlayerId].name
        : null;

    const lastEliminatedUid = gameState.eliminatedPlayer;
    const lastEliminatedName =
      lastEliminatedUid && roomData.players?.[lastEliminatedUid]?.name
        ? roomData.players[lastEliminatedUid].name
        : null;
    const lastEliminatedRole = gameState.eliminatedRole || null;

    if (playerState.eliminated) {
      return (
        <View style={styles.container}>
          <StatusCard
            tone="muted"
            title="Sei stato eliminato"
            message="La partita continua per gli altri giocatori. Resta in attesa del risultato finale."
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {!showRole ? (
          <>
            <MetaCorner position="top-left" label="Stanza" value={roomId} />
            <MetaCorner position="top-right" label="Giocatori" value={String(playerCount)} />

            <View style={styles.card}>
              <View style={styles.cardInner}>
                <Text style={styles.revealTitle}>
                  I ruoli sono stati assegnati...
                </Text>

                <View style={styles.revealHintIcons}>
                  <DaggerIcon size={32} />
                  <ShieldIcon size={32} />
                  <MaskIcon size={32} />
                </View>

                <View style={styles.revealButtonWrapper}>
                  <Button onPress={handleReveal} variant="primary" size="lg">
                    Scopri il tuo ruolo
                  </Button>
                </View>

                <Text style={styles.description}>
                  Tocca per svelare il tuo ruolo in segreto. Non mostrare lo
                  schermo a nessuno. Il gioco inizierà tra poco.
                </Text>
              </View>
            </View>

            {firstPlayerName ? (
              <Text style={styles.firstPlayerLine}>
                <Text style={styles.firstPlayerName}>{firstPlayerName}</Text>
                {' è il primo giocatore'}
              </Text>
            ) : null}

            <MetaCorner
              position="bottom-right"
              label="Pronti"
              value={`${readyCount}/${playerCount}`}
            />
          </>
        ) : (
          <>
            {lastEliminatedName ? (
              <View style={styles.eliminationBanner}>
                <Text style={styles.eliminationBannerText}>
                  Eliminato:{' '}
                  <Text style={styles.eliminationBannerName}>
                    {lastEliminatedName}
                  </Text>
                  {lastEliminatedRole ? (
                    <Text
                      style={[
                        styles.eliminationBannerRole,
                        { color: roleColor(lastEliminatedRole) },
                      ]}
                    >
                      {' '}· {roleLabel(lastEliminatedRole)}
                    </Text>
                  ) : null}
                </Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.iconWrapper}>
                  <RoleIcon role={role} size={72} />
                </View>

                <Text style={[styles.roleText, { color: roleColor(role) }]}>
                  {roleLabel(role)}
                </Text>

                {displayWord ? (
                  <WordBox
                    label={wordLabel ?? undefined}
                    word={displayWord}
                    style={styles.wordSpacing}
                  />
                ) : (
                  <WordBox
                    label="Nessun indizio"
                    word="???"
                    tone="muted"
                    autoCapitalize={false}
                    style={styles.wordSpacing}
                  />
                )}

                <Text style={styles.description}>
                  {roleDescription(role, !!displayWord)}
                </Text>
              </View>
            </View>

            {firstPlayerName ? (
              <Text style={styles.firstPlayerLine}>
                <Text style={styles.firstPlayerName}>{firstPlayerName}</Text>
                {' è il primo giocatore'}
              </Text>
            ) : null}

            <GhostButton
              onPress={() => setShowRole(false)}
              icon={<EyeOffIcon size={18} color={colors.textPrimary} />}
              style={styles.hideButton}
            >
              Nascondi
            </GhostButton>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {playerCount} GIOCATORI · IMPOSTORE
              </Text>
            </View>
          </>
        )}
      </View>
    );
  }

  // ── Voting Phase ──
  if (gameState.phase === 'voting') {
    if (playerState.eliminated) {
      return (
        <View style={styles.container}>
          <StatusCard
            tone="muted"
            title="Sei stato eliminato"
            message="Non puoi votare. Attendi il risultato della votazione."
          />
        </View>
      );
    }

    const myVote = gameState.votes?.[playerId] ?? null;
    const runoff = gameState.runoffCandidates;
    const isRunoff = !!(runoff && runoff.length > 0);

    const candidates = Object.entries(roomData.players || {}).filter(([uid, p]) => {
      if ((p as ImpostorePlayerState).eliminated) return false;
      if (isRunoff && !runoff!.includes(uid)) return false;
      return true;
    });

    const votesCast = Object.keys(gameState.votes || {}).length;
    const totalVoters = Object.values(roomData.players || {}).filter(
      (p) => !(p as ImpostorePlayerState).eliminated
    ).length;

    const firstPlayerId = gameState.firstPlayerId;
    const firstPlayerName =
      firstPlayerId && roomData.players?.[firstPlayerId]?.name
        ? roomData.players[firstPlayerId].name
        : null;

    return (
      <ScrollView
        contentContainerStyle={[styles.container, styles.votingScroll]}
        keyboardShouldPersistTaps="handled"
      >
        <VotingTimer
          endsAt={gameState.votingEndsAt}
          totalSeconds={gameState.votingSeconds ?? 60}
        />

        <PhaseCard
          title={isRunoff ? 'Ballottaggio' : 'Votazione'}
          description={
            isRunoff
              ? 'Pareggio. Scegli tra i candidati qui sotto.'
              : "Tocca il giocatore che pensi sia l'impostore. Puoi cambiare voto finché il tempo non scade."
          }
          tone={isRunoff ? 'warning' : 'cyan'}
        >
          {isRunoff && firstPlayerName ? (
            <Text style={styles.tiebreakerNote}>
              In caso di pareggio il voto di{' '}
              <Text style={styles.tiebreakerName}>{firstPlayerName}</Text>{' '}
              vale doppio.
            </Text>
          ) : null}

          <View style={styles.voteList}>
            {candidates.map(([uid, p]) => {
              const isSelf = uid === playerId;
              const name = p.name || 'Senza nome';
              const isMyVote = myVote === uid;
              const isPending = pendingVote === uid;
              return (
                <View
                  key={uid}
                  // Colored only once the vote is CONFIRMED — a pending
                  // pick shows just the ✓/✕ pair, no highlight.
                  style={[styles.voteRow, isMyVote && styles.voteRowSelected]}
                >
                  <PlayerSlot
                    uid={uid}
                    name={name}
                    isMe={isSelf}
                    subtitle={null}
                    onPress={
                      isSelf ? undefined : () => setPendingVote(isPending ? null : uid)
                    }
                    disabled={isSelf}
                    variant={isSelf ? 'dimmed' : isMyVote ? 'selected' : 'default'}
                    right={
                      isPending ? (
                        <InlineConfirm
                          onConfirm={() => {
                            setPendingVote(null);
                            handleVote(uid);
                          }}
                          onCancel={() => setPendingVote(null)}
                        />
                      ) : isMyVote ? (
                        <CheckIcon size={20} color={colors.primaryLight} />
                      ) : undefined
                    }
                  />
                </View>
              );
            })}
          </View>

          <ProgressCounter
            completed={votesCast}
            total={totalVoters}
            suffix="hanno votato"
            style={styles.voteProgress}
          />
        </PhaseCard>
      </ScrollView>
    );
  }

  // ── Impostor Guess Phase ──
  if (gameState.phase === 'impostor_guess') {
    const eliminatedUid = gameState.eliminatedPlayer;
    const eliminatedName =
      eliminatedUid && roomData.players?.[eliminatedUid]?.name
        ? roomData.players[eliminatedUid].name
        : 'Giocatore';
    const eliminatedRole = gameState.eliminatedRole;
    const isEliminatedMe = eliminatedUid === playerId;

    return (
      <View style={styles.container}>
        <StatusCard
          title={isEliminatedMe ? 'Sei stato eliminato.' : `${eliminatedName} eliminato.`}
          tone="neutral"
        >
          <Text style={[styles.eliminationRole, { color: roleColor(eliminatedRole || null) }]}>
            Era un {roleLabel(eliminatedRole || null).toLowerCase()}.
          </Text>

          {isEliminatedMe ? (
            <View style={styles.guessContainer}>
              <Text style={styles.guessLabel}>Prova a indovinare la parola:</Text>
              <TextInput
                style={styles.guessInput}
                value={guessText}
                onChangeText={setGuessText}
                placeholder="La parola è..."
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
              <Button
                onPress={handleSubmitGuess}
                variant="primary"
                style={{ marginTop: spacing.md }}
              >
                Indovina
              </Button>
            </View>
          ) : (
            <Text style={styles.waitingText}>
              L'impostore sta tentando di indovinare la parola...
            </Text>
          )}
        </StatusCard>
      </View>
    );
  }

  // ── Results Phase ──
  // Minimal recap, identical for every player: who won (name + role)
  // and the secret word revealed to everyone.
  if (gameState.phase === 'results') {
    const winner = gameState.winner;

    let winnerTitle = 'Partita conclusa';
    let winnerColor: string = colors.textPrimary;
    let winnerIconRole: PlayerRole = null;

    if (winner === 'impostor') {
      winnerTitle = "Vince l'Impostore";
      winnerColor = colors.roleImpostor;
      winnerIconRole = 'impostor';
    } else if (winner === 'clown') {
      winnerTitle = 'Vince il Pagliaccio';
      winnerColor = colors.roleClown;
      winnerIconRole = 'clown';
    } else if (winner === 'civilians') {
      winnerTitle = 'Vincono i Civili';
      winnerColor = colors.roleCivilian;
      winnerIconRole = 'civilian';
    }

    const winnerNames = winnerIconRole
      ? Object.values(roomData.players || {})
          .filter((p) => (p as ImpostorePlayerState).role === winnerIconRole)
          .map((p) => p.name || 'Senza nome')
      : [];

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            styles.winnerCard,
            { borderColor: winnerColor },
          ]}
        >
          <View style={styles.cardInner}>
            <View style={styles.gameOverHeader}>
              <TrophyIcon size={14} color={winnerColor} />
              <Text style={[styles.gameOverLabel, { color: winnerColor }]}>
                FINE PARTITA
              </Text>
            </View>

            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: colors.background, borderWidth: 2, borderColor: winnerColor },
              ]}
            >
              <RoleIcon role={winnerIconRole} size={72} />
            </View>

            <Text style={[styles.roleText, { color: winnerColor }]}>
              {winnerTitle}
            </Text>

            {winnerNames.length > 0 ? (
              <Text style={styles.winnerNames}>{winnerNames.join(' · ')}</Text>
            ) : null}

            <WordBox
              label="La parola era"
              word={gameState.word}
              style={styles.wordSpacingTop}
            />
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    flex: 1,
    justifyContent: 'center',
  },
  revealButtonWrapper: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  revealTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.3,
    marginBottom: spacing.lg,
  },
  revealHintIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    position: 'relative',
  },
  firstPlayerLine: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  firstPlayerName: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
  },
  eliminationBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  eliminationBannerText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  eliminationBannerName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
  },
  eliminationBannerRole: {
    fontFamily: fonts.bodySemi,
  },
  cardInner: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  roleText: {
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xxl,
    marginBottom: spacing.lg,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  wordSpacing: {
    marginBottom: spacing.lg,
  },
  wordSpacingTop: {
    marginTop: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  hideButton: {
    marginTop: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
  },
  votingScroll: {
    flexGrow: 1,
  },
  voteList: {
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  voteRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  voteRowSelected: {
    borderColor: colors.primary,
  },
  tiebreakerNote: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tiebreakerName: {
    color: colors.warning,
    fontFamily: fonts.bodySemi,
    fontStyle: 'normal',
  },
  winnerNames: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  winnerCard: {
    borderWidth: 2,
  },
  gameOverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  gameOverLabel: {
    fontFamily: fonts.displayHeavy,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  voteProgress: {
    textAlign: 'center',
  },
  eliminationRole: {
    fontFamily: fonts.display,
    fontSize: fontSize.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  guessContainer: {
    alignItems: 'stretch',
    width: '100%',
    marginTop: spacing.md,
  },
  guessLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    marginBottom: 6,
    textAlign: 'center',
  },
  guessInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waitingText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
