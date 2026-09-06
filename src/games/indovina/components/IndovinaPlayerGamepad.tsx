import { FitContent } from '../../../core/ui/FitContent';
import { wrappingText } from '../../../core/ui/wrappingText';
import { useGameViewport } from '../../../core/hooks/useGameViewport';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  Input,
  MetaRow,
  SegmentedControl,
  StatusCard,
  avatarColor,
  avatarInitial,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { capitalize } from '../../../core/utils/text';
import { IndovinaGameState, IndovinaPlayerState } from '../types';
import { submitPlayerWord } from '../services/indovinaLogic';

type DisplayMode = 'blurred' | 'visible';

const BLURRED_PLACEHOLDER = '██████';

export default function IndovinaPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const {onLayout, compact} = useGameViewport();
  const gameState = roomData.gameState as IndovinaGameState;
  const playerState = roomData.players?.[playerId] as IndovinaPlayerState | undefined;
  const roomId = roomData.id;

  const [revealedUid, setRevealedUid] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('blurred');

  useEffect(() => {
    setDisplayMode('blurred');
    setRevealedUid(null);
  }, [gameState?.phase]);

  if (!playerState) return null;

  if (gameState?.phase === 'collecting') {
    return (
      <CollectingView
        roomData={roomData}
        playerId={playerId}
        playerState={playerState}
      />
    );
  }

  if (gameState?.phase !== 'playing') {
    return (
      <View style={styles.centered}>
        <StatusCard
          title="In attesa..."
          message="L'host non ha ancora avviato la partita."
        />
      </View>
    );
  }

  const allPlayers = Object.entries(roomData.players || {}).filter(([, p]) => !p.waiting);
  const otherPlayers = allPlayers.filter(([uid]) => uid !== playerId);
  const playerCount = allPlayers.length;
  const firstPlayerId = gameState?.firstPlayerId ?? null;
  const firstPlayerEntry = firstPlayerId
    ? allPlayers.find(([uid]) => uid === firstPlayerId)
    : undefined;
  const firstPlayerName = firstPlayerEntry
    ? ((firstPlayerEntry[1] as IndovinaPlayerState).name || 'Senza nome')
    : null;
  const firstIsMe = firstPlayerEntry?.[0] === playerId;


  return (
    <View onLayout={onLayout} style={[styles.container, compact && {padding: spacing.sm}]}>
      <MetaRow roomId={roomId} players={playerCount} />

      <FitContent testID="indovina-cards">
        <View style={[styles.card, compact && {padding: spacing.md}]}>
          <Text style={styles.title}>PAROLE DEGLI ALTRI</Text>
          <Text style={styles.subtitle}>
            {displayMode === 'blurred'
              ? 'Fai domande sì/no per indovinare la tua. Tieni premuto su un giocatore per vedere la sua parola.'
              : 'Fai domande sì/no per indovinare la tua.'}
          </Text>

          <SegmentedControl<DisplayMode>
            value={displayMode}
            onChange={(mode) => {
              setDisplayMode(mode);
              if (mode === 'blurred') setRevealedUid(null);
            }}
            options={[
              { value: 'blurred', label: 'Nascoste' },
              { value: 'visible', label: 'Visibili' },
            ]}
            style={{ marginBottom: spacing.lg }}
          />

          <View style={styles.list}>
            {otherPlayers.length === 0 ? (
              <Text style={styles.empty}>Sei l'unico giocatore in stanza.</Text>
            ) : (
              otherPlayers.map(([uid, p]) => {
                const player = p as IndovinaPlayerState;
                const name = player.name || 'Senza nome';
                const word = player.word;
                const shouldReveal = displayMode === 'visible' || revealedUid === uid;
                const pressableProps = displayMode === 'blurred'
                  ? {
                      onPressIn: () => setRevealedUid(uid),
                      onPressOut: () => setRevealedUid((cur) => (cur === uid ? null : cur)),
                      delayLongPress: 120,
                    }
                  : {};
                return (
                  <Pressable
                    key={uid}
                    style={({ pressed }) => [
                      styles.row,
                      compact && {paddingVertical: spacing.sm, paddingHorizontal: spacing.sm},
                      displayMode === 'blurred' && (pressed || revealedUid === uid) && styles.rowPressed,
                    ]}
                    {...pressableProps}
                  >
                    <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
                      <Text style={styles.avatarText}>{avatarInitial(name)}</Text>
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowName}>{name}</Text>
                      {shouldReveal && word ? (
                        <Text style={styles.rowWord}>{capitalize(word)}</Text>
                      ) : (
                        <Text style={[styles.rowWord, styles.rowWordBlurred]} selectable={false}>
                          {BLURRED_PLACEHOLDER}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {firstPlayerName && otherPlayers.length > 0 && (
          <Text style={styles.startsLine}>
            <Text style={styles.startsName}>
              {firstIsMe ? `${firstPlayerName} (tu)` : firstPlayerName}
            </Text>
            {' è il primo giocatore'}
          </Text>
        )}
      </FitContent>


    </View>
  );
}

interface CollectingViewProps {
  roomData: PlayerGamepadProps['roomData'];
  playerId: string;
  playerState: IndovinaPlayerState;
}

function CollectingView({ roomData, playerId, playerState }: CollectingViewProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const players = Object.entries(roomData.players || {}).filter(([, p]) => !p.waiting);
  const totalPlayers = players.length;
  const submittedCount = players.filter(
    ([, p]) => !!(p as IndovinaPlayerState).hasSubmittedWord
  ).length;

  const hasSubmitted = !!playerState.submittedWord;

  const handleSubmit = async () => {
    const word = draft.trim();
    if (!word) {
      setError('Inserisci una parola');
      return;
    }
    if (word.length > 60) {
      setError('Massimo 60 caratteri');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPlayerWord(roomData.id, playerId, word);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore invio parola');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>SCRIVI UNA PAROLA</Text>
          <Text style={styles.subtitle}>
            La tua parola verrà data a un altro giocatore (mai a te).
          </Text>

          {hasSubmitted ? (
            <View style={styles.submittedBox}>
              <Text style={styles.submittedLabel}>Hai inviato</Text>
              <Text style={styles.submittedValue}>
                {capitalize(playerState.submittedWord || '')}
              </Text>
              <Text style={styles.submittedHint}>
                Aspettando gli altri giocatori...
              </Text>
            </View>
          ) : (
            <View>
              <Input
                placeholder="Es. Cleopatra, pizza, Roma..."
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  if (error) setError(null);
                }}
                maxLength={60}
                style={{ marginBottom: error ? spacing.sm : spacing.md }}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button
                onPress={handleSubmit}
                disabled={submitting || !draft.trim()}
                variant="primary"
                size="lg"
              >
                {submitting ? 'Invio...' : 'Invia parola'}
              </Button>
            </View>
          )}

          <Text style={styles.progressText}>
            {submittedCount}/{totalPlayers} hanno inviato
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.lg,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  list: {
    gap: spacing.sm + 2,
  },
  startsLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
  startsName: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    letterSpacing: 0.5,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...Platform.select({
      web: {
        userSelect: 'none' as const,
        cursor: 'pointer' as const,
      },
    }),
  },
  rowPressed: {
    borderColor: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#ffffff',
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.md,
  },
  rowContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    ...Platform.select({
      web: { overflow: 'hidden' as const },
    }),
  },
  rowName: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
    ...Platform.select({
      web: {
        whiteSpace: 'normal' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'anywhere' as const,
      },
    }),
  },
  rowWord: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
    width: '100%',
    ...Platform.select({
      web: {
        whiteSpace: 'normal' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'anywhere' as const,
      },
    }),
  },
  rowWordBlurred: {
    color: colors.textSecondary,
    letterSpacing: 2,
    ...Platform.select({
      web: {
        filter: 'blur(4px)' as const,
        userSelect: 'none' as const,
      },
    }),
  },
  revealActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  actionHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  countdownHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0.5,
  },
  countdownNumber: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: 180,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 200,
  },
  mineContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  mineCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible',
  },
  tapTarget: {
    ...Platform.select({
      web: {
        touchAction: 'manipulation' as const,
        userSelect: 'none' as const,
        cursor: 'pointer' as const,
      },
    }),
  },
  mineWord: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    letterSpacing: 1,
    textAlign: 'center',
  },
  hideButtonContainer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  hideHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  submittedBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submittedLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  submittedValue: {
    ...wrappingText,
    width: '100%',
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl + 6,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submittedHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  progressText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
  },
});
