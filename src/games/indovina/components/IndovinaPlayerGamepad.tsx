import { FirstPlayerCard } from '../../../core/components/FirstPlayerCard';
import { FitContent } from '../../../core/ui/FitContent';
import { wrappingText } from '../../../core/ui/wrappingText';
import { useGameViewport } from '../../../core/hooks/useGameViewport';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
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

type DisplayMode = 'blurred' | 'visible';

const BLURRED_PLACEHOLDER = '██████';

export default function IndovinaPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const {onLayout} = useGameViewport();
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
    <View onLayout={onLayout} style={styles.container}>
      <MetaRow roomId={roomId} players={playerCount} />

      <FitContent testID="indovina-cards">
        <View style={styles.card}>
          <Text style={styles.title}>PAROLE DEGLI ALTRI</Text>
          <SegmentedControl<DisplayMode>
            compact
            value={displayMode}
            onChange={(mode) => {
              setDisplayMode(mode);
              if (mode === 'blurred') setRevealedUid(null);
            }}
            options={[
              { value: 'blurred', label: 'Nascoste' },
              { value: 'visible', label: 'Visibili' },
            ]}
            style={{ marginBottom: spacing.sm }}
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
                      displayMode === 'blurred' && (pressed || revealedUid === uid) && styles.rowPressed,
                    ]}
                    {...pressableProps}
                  >
                    <View style={styles.playerIdentity}>
                      <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
                        <Text style={styles.avatarText}>{avatarInitial(name)}</Text>
                      </View>
                      <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
                    </View>
                    <View style={styles.rowContent}>
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
          <FirstPlayerCard name={firstPlayerName} isMe={firstIsMe} />
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

const styles = StyleSheet.create({
  container: {
    minHeight: 0,
    minWidth: 0,
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.lg,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
  playerIdentity: {
    width: 64,
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.sm,
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
    textAlign: 'center',
    width: '100%',
    letterSpacing: 0.2,
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
