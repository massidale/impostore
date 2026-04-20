import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Ellipse } from 'react-native-svg';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import { Button, colors, radius, spacing, fontSize } from '../../../core/ui';
import { ImpostoreGameState, ImpostorePlayerState, PlayerRole } from '../types';
import { markPlayerAsRevealed, castVote, submitImpostorGuess } from '../services/impostoreLogic';

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

function initial(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

const AVATAR_PALETTE = [
  '#2563eb',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function avatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
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

const TrophyIcon = ({ size = 28, color = colors.warning }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill={color} fillOpacity={0.18} />
    <Path d="M7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M10 14h4v2h-4zM9 21h6M12 16v5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ size = 48, color = colors.success }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeOffIcon = ({ size = 18, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1={1} y1={1} x2={23} y2={23} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

function RoleIcon({ role, size }: { role: PlayerRole; size?: number }) {
  const color = roleColor(role);
  if (role === 'civilian') return <CivilianIcon size={size} color={color} />;
  if (role === 'impostor') return <ImpostorIcon size={size} color={color} />;
  if (role === 'clown') return <ClownIcon size={size} color={color} />;
  // Placeholder circle
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

    return (
      <View style={styles.container}>
        {!showRole ? (
          <>
            <View style={styles.revealMetaTop}>
              <Text style={styles.revealMetaLabel}>Stanza</Text>
              <Text style={styles.revealMetaValue}>{roomId}</Text>
              <Text style={[styles.revealMetaLabel, { marginTop: spacing.xs }]}>
                Giocatori
              </Text>
              <Text style={styles.revealMetaValue}>{playerCount}</Text>
            </View>

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

                <Text style={styles.revealInstructions}>
                  Tocca per svelare il tuo ruolo in segreto. Non mostrare lo
                  schermo a nessuno. Il gioco inizierà tra poco.
                </Text>
              </View>
            </View>

            <View style={styles.revealMetaBottom}>
              <Text style={styles.revealMetaLabel}>Pronti</Text>
              <Text style={styles.revealMetaValue}>
                {readyCount}/{playerCount}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              {playerState.isFirst ? (
                <View style={styles.firstBadge}>
                  <Text style={styles.firstBadgeText}>PRIMO GIOCATORE</Text>
                </View>
              ) : null}

              <View style={styles.cardInner}>
                <View style={styles.iconWrapper}>
                  <RoleIcon role={role} size={72} />
                </View>

                <Text style={[styles.roleText, { color: roleColor(role) }]}>
                  {roleLabel(role)}
                </Text>

                {displayWord ? (
                  <View style={styles.wordBox}>
                    {wordLabel ? <Text style={styles.wordLabel}>{wordLabel}</Text> : null}
                    <Text
                      style={styles.wordValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {capitalize(displayWord)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.wordBox}>
                    <Text style={styles.wordLabel}>Nessun indizio</Text>
                    <Text style={styles.noHintValue}>???</Text>
                  </View>
                )}

                <Text style={styles.description}>
                  {roleDescription(role, !!displayWord)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowRole(false)}
              style={styles.hideButton}
            >
              <EyeOffIcon size={18} color={colors.textPrimary} />
              <Text style={styles.hideButtonText}>Nascondi</Text>
            </TouchableOpacity>

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
    const hasVoted = gameState.votes && gameState.votes[playerId];
    const runoff = gameState.runoffCandidates;
    const isRunoff = !!(runoff && runoff.length > 0);

    const candidates = Object.entries(roomData.players || {}).filter(([uid]) => {
      if (isRunoff && !runoff!.includes(uid)) return false;
      return true;
    });

    const votesCast = Object.keys(gameState.votes || {}).length;
    const totalVoters = Object.keys(roomData.players || {}).length;

    const titleColor = isRunoff ? colors.warning : colors.textPrimary;
    const titleText = isRunoff ? 'BALLOTTAGGIO' : 'VOTAZIONE';
    const titleDescription = isRunoff
      ? 'Pareggio. Scegli tra i candidati qui sotto.'
      : "Tocca il giocatore che pensi sia l'impostore.";

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
        <View style={styles.card}>
          {hasVoted ? (
            <View style={styles.cardInner}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceAlt }]}>
                <CheckIcon size={56} color={colors.success} />
              </View>
              <Text style={[styles.roleText, { color: colors.success }]}>
                Voto registrato
              </Text>
              <Text style={styles.description}>
                Attendi che tutti gli altri abbiano espresso la loro preferenza.
              </Text>
              <View style={styles.wordBox}>
                <Text style={styles.wordLabel}>Votazioni</Text>
                <Text style={styles.wordValue}>
                  {votesCast}/{totalVoters}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.cardInner}>
              <Text style={[styles.roleText, { color: titleColor }]}>
                {titleText}
              </Text>
              <Text style={styles.description}>{titleDescription}</Text>

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
                  return (
                    <TouchableOpacity
                      key={uid}
                      onPress={isSelf ? undefined : () => handleVote(uid)}
                      disabled={isSelf}
                      activeOpacity={0.7}
                      style={[styles.voteRow, isSelf && styles.voteRowDisabled]}
                    >
                      <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
                        <Text style={styles.avatarText}>{initial(name)}</Text>
                      </View>
                      <Text style={styles.voteRowName} numberOfLines={1}>
                        {name}
                      </Text>
                      {isSelf && <Text style={styles.voteRowSelfTag}>TU</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.voteProgress}>
                {votesCast}/{totalVoters} hanno votato
              </Text>
            </View>
          )}
        </View>
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
        <View style={styles.roleBox}>
          <Text style={styles.eliminationText}>
            {isEliminatedMe ? 'Sei stato eliminato.' : `${eliminatedName} eliminato.`}
          </Text>
          <Text style={[styles.eliminationRole, { color: roleColor(eliminatedRole || null) }]}>
            Era un {roleLabel(eliminatedRole || null).toLowerCase()}.
          </Text>

          {isEliminatedMe ? (
            <View style={styles.guessContainer}>
              <Text style={styles.infoLabel}>Prova a indovinare la parola:</Text>
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
        </View>
      </View>
    );
  }

  // ── Results Phase ──
  if (gameState.phase === 'results') {
    const eliminatedUid = gameState.eliminatedPlayer;
    const eliminatedName =
      eliminatedUid && roomData.players?.[eliminatedUid]?.name
        ? roomData.players[eliminatedUid].name
        : 'Giocatore';
    const eliminatedRole = gameState.eliminatedRole;

    const winner = gameState.winner;
    const myRole = playerState.role;
    const didIWin =
      (winner === 'civilians' && myRole === 'civilian') ||
      (winner === 'impostor' && myRole === 'impostor') ||
      (winner === 'clown' && myRole === 'clown');

    let winnerTitle = 'Partita conclusa';
    let winnerColor: string = colors.textPrimary;
    let winnerDescription = '';
    let winnerIconRole: PlayerRole = null;

    if (winner === 'impostor') {
      winnerTitle = "Vince l'Impostore";
      winnerColor = colors.roleImpostor;
      winnerIconRole = 'impostor';
      winnerDescription = gameState.impostorGuess
        ? "L'impostore ha indovinato la parola e si è salvato in extremis."
        : "L'impostore è rimasto nell'ombra fino alla fine.";
    } else if (winner === 'clown') {
      winnerTitle = 'Vince il Pagliaccio';
      winnerColor = colors.roleClown;
      winnerIconRole = 'clown';
      winnerDescription = 'Il pagliaccio si è fatto eliminare come voleva.';
    } else if (winner === 'civilians') {
      winnerTitle = 'Vincono i Civili';
      winnerColor = colors.roleCivilian;
      winnerIconRole = 'civilian';
      winnerDescription = "I civili hanno smascherato l'impostore.";
    }

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            styles.winnerCard,
            { borderColor: winnerColor },
          ]}
        >
          {winner ? (
            <View
              style={[
                styles.resultBadge,
                { backgroundColor: didIWin ? colors.success : colors.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.resultBadgeText,
                  { color: didIWin ? '#111827' : colors.textSecondary },
                ]}
              >
                {didIWin ? 'HAI VINTO' : 'HAI PERSO'}
              </Text>
            </View>
          ) : null}

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

            {winnerDescription ? (
              <Text style={styles.description}>{winnerDescription}</Text>
            ) : null}

            <View style={styles.wordBox}>
              <Text style={styles.wordLabel}>La parola era</Text>
              <Text style={styles.wordValue} numberOfLines={1} adjustsFontSizeToFit>
                {capitalize(gameState.word)}
              </Text>
            </View>

            {eliminatedUid ? (
              <View style={styles.resultRecapRow}>
                <Text style={styles.resultRecapLabel}>Eliminato</Text>
                <Text style={styles.resultRecapValue} numberOfLines={1}>
                  {eliminatedName}
                </Text>
                <View
                  style={[
                    styles.resultRoleTag,
                    { borderColor: roleColor(eliminatedRole || null) },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultRoleTagText,
                      { color: roleColor(eliminatedRole || null) },
                    ]}
                  >
                    {roleLabel(eliminatedRole || null).toUpperCase()}
                  </Text>
                </View>
              </View>
            ) : null}

            {gameState.impostorGuess ? (
              <View style={styles.guessRecapBox}>
                <Text style={styles.wordLabel}>L'impostore ha provato</Text>
                <Text style={styles.guessRecapValue}>
                  "{gameState.impostorGuess}"
                </Text>
              </View>
            ) : null}
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
  revealMetaTop: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },
  revealMetaBottom: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    alignItems: 'flex-end',
  },
  revealMetaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  revealMetaValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  revealTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
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
  revealInstructions: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    position: 'relative',
  },
  firstBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 1,
  },
  firstBadgeText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.lg,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  wordBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  wordValue: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  noHintValue: {
    color: colors.textMuted,
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  hideButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
  },
  votingScroll: {
    flexGrow: 1,
  },
  voteList: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  tiebreakerNote: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tiebreakerName: {
    color: colors.warning,
    fontWeight: '700',
    fontStyle: 'normal',
  },
  resultBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 1,
  },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  resultRecapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  resultRecapLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: spacing.sm,
  },
  resultRecapValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  resultRoleTag: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  resultRoleTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  guessRecapBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  guessRecapValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
    fontStyle: 'italic',
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  voteRowDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  voteRowName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  voteRowSelfTag: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: spacing.sm,
  },
  voteProgress: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // legacy styles kept for voting / guess / results phases
  title: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 17,
    marginBottom: spacing.sm + 2,
    textAlign: 'center',
  },
  roleBox: {
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: 6,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  votingContainer: { gap: spacing.sm + 2 },
  eliminationText: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eliminationRole: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
  guessContainer: {
    alignItems: 'stretch',
    width: '100%',
    marginTop: spacing.lg,
  },
  guessInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  guessRecap: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
