import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
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
    await castVote(roomId, playerId, targetUid);
  };

  const handleSubmitGuess = async () => {
    if (!guessText.trim()) return;
    await submitImpostorGuess(roomId, guessText.trim());
  };

  if (!playerState) return null;

  // ── Playing Phase ──
  if (gameState.phase === 'playing') {
    const role = playerState.role;
    const hasHint = role === 'impostor' && gameState.hint;
    const shouldShowHint =
      hasHint && (!gameState.hintOnlyFirst || playerState.isFirst);

    return (
      <View style={styles.container}>
        {!showRole ? (
          <Button onPress={handleReveal} variant="primary" size="lg">
            Scopri
          </Button>
        ) : (
          <View style={styles.roleBox}>
            <Text style={[styles.roleText, { color: roleColor(role) }]}>
              {roleLabel(role)}
            </Text>

            {role !== 'impostor' ? (
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>La parola è:</Text>
                <Text style={styles.infoValue}>{capitalize(gameState.word)}</Text>
              </View>
            ) : shouldShowHint ? (
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>L'indizio è:</Text>
                <Text style={styles.infoValue}>{capitalize(gameState.hint!)}</Text>
              </View>
            ) : (
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Nessun indizio disponibile</Text>
              </View>
            )}

            {playerState.isFirst ? (
              <Text style={styles.firstPlayerText}>Sei il primo giocatore</Text>
            ) : null}

            <Button
              onPress={() => setShowRole(false)}
              variant="secondary"
              style={{ marginTop: spacing.xl }}
            >
              Nascondi
            </Button>
          </View>
        )}
      </View>
    );
  }

  // ── Voting Phase ──
  if (gameState.phase === 'voting') {
    const hasVoted = gameState.votes && gameState.votes[playerId];
    const runoff = gameState.runoffCandidates;
    const isRunoff = !!(runoff && runoff.length > 0);

    const entries = Object.entries(roomData.players || {}).filter(([uid]) => {
      if (uid === playerId) return false;
      if (isRunoff && !runoff!.includes(uid)) return false;
      return true;
    });

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {isRunoff ? 'Ballottaggio' : 'Fase di votazione'}
        </Text>

        {hasVoted ? (
          <View style={styles.roleBox}>
            <Text style={styles.statusText}>Hai votato! Attendi gli altri...</Text>
          </View>
        ) : (
          <View style={styles.votingContainer}>
            <Text style={styles.statusText}>Chi vuoi eliminare?</Text>
            {entries.map(([uid, p]) => (
              <Button
                key={uid}
                onPress={() => handleVote(uid)}
                variant="secondary"
                style={{ marginBottom: spacing.sm }}
              >
                {p.name || 'Senza nome'}
              </Button>
            ))}
          </View>
        )}
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
            {isEliminatedMe ? 'Tu' : eliminatedName} eliminato.
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
    const isEliminatedMe = eliminatedUid === playerId;

    let winnerText = '';
    let winnerColor: string = colors.success;
    if (gameState.winner === 'impostor') {
      winnerText = "Ha vinto l'Impostore!";
      winnerColor = colors.roleImpostor;
    } else if (gameState.winner === 'clown') {
      winnerText = 'Ha vinto il Pagliaccio!';
      winnerColor = colors.roleClown;
    } else if (gameState.winner === 'civilians') {
      winnerText = 'Hanno vinto i Civili!';
      winnerColor = colors.roleCivilian;
    }

    return (
      <View style={styles.container}>
        <View style={styles.roleBox}>
          <Text style={styles.eliminationText}>
            {isEliminatedMe ? 'Tu' : eliminatedName} eliminato.
          </Text>
          <Text style={[styles.eliminationRole, { color: roleColor(eliminatedRole || null) }]}>
            Era un {roleLabel(eliminatedRole || null).toLowerCase()}.
          </Text>

          <Text style={[styles.winnerText, { color: winnerColor }]}>{winnerText}</Text>

          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>La parola era:</Text>
            <Text style={styles.infoValue}>{capitalize(gameState.word)}</Text>
          </View>

          {gameState.impostorGuess ? (
            <Text style={styles.guessRecap}>
              L'impostore ha provato: "{gameState.impostorGuess}"
            </Text>
          ) : null}
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
    borderRadius: radius.md,
    flex: 1,
  },
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
  roleText: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: spacing.xl,
    textAlign: 'center',
    textTransform: 'uppercase',
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
  firstPlayerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
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
