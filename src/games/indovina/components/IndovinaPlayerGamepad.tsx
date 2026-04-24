import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  Input,
  colors,
  radius,
  spacing,
  fontSize,
  avatarColor,
  avatarInitial,
} from '../../../core/ui';
import { IndovinaGameState, IndovinaPlayerState } from '../types';
import { submitPlayerWord } from '../services/indovinaLogic';

type ViewMode = 'others' | 'mine';
type DisplayMode = 'blurred' | 'visible';

const BLURRED_PLACEHOLDER = '██████';

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function useKeepScreenAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return;
    const nav = navigator as unknown as {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;

    let wakeLock: { release: () => Promise<void> } | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await nav.wakeLock!.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        wakeLock = lock;
      } catch {
        // screen wake lock not granted — nothing we can do
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLock && !cancelled) {
        request();
      }
    };

    request();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [enabled]);
}

interface IconProps {
  size?: number;
  color?: string;
}

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

const WarningIcon = ({ size = 20, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L1.5 21h21L12 3z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.18}
    />
    <Line x1={12} y1={10} x2={12} y2={15} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Circle cx={12} cy={18} r={1.1} fill={color} />
  </Svg>
);

function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = false
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annulla', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

export default function IndovinaPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const gameState = roomData.gameState as IndovinaGameState;
  const playerState = roomData.players?.[playerId] as IndovinaPlayerState | undefined;
  const roomId = roomData.id;

  const [viewMode, setViewMode] = useState<ViewMode>('others');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedUid, setRevealedUid] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('blurred');
  const [keepAwake, setKeepAwake] = useState(false);

  useKeepScreenAwake(keepAwake);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setViewMode('mine');
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

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
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.waitingTitle}>In attesa...</Text>
            <Text style={styles.waitingText}>
              L'host non ha ancora avviato la partita.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const myWord = playerState.word;

  if (!myWord) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.waitingTitle}>Caricamento...</Text>
            <Text style={styles.waitingText}>Stiamo assegnando la tua parola.</Text>
          </View>
        </View>
      </View>
    );
  }

  if (viewMode === 'mine') {
    return (
      <MineView
        word={myWord}
        onBack={() => {
          setViewMode('others');
          setKeepAwake(false);
          setDisplayMode('blurred');
          setRevealedUid(null);
        }}
      />
    );
  }

  if (countdown !== null) {
    return <CountdownView value={countdown} onCancel={() => setCountdown(null)} />;
  }

  const allPlayers = Object.entries(roomData.players || {});
  const otherPlayers = allPlayers.filter(([uid]) => uid !== playerId);
  const playerCount = allPlayers.length;
  const firstPlayerEntry = allPlayers[0];
  const firstPlayerName = firstPlayerEntry
    ? ((firstPlayerEntry[1] as IndovinaPlayerState).name || 'Senza nome')
    : null;
  const firstIsMe = firstPlayerEntry?.[0] === playerId;

  const handleReveal = () => {
    confirmAction(
      'Mostrare la tua parola?',
      'Lo schermo mostrerà la TUA parola in chiaro: tieni il telefono lontano dai tuoi occhi e mostrala agli altri.',
      'Rivela',
      () => {
        setKeepAwake(true);
        setCountdown(3);
      },
      true
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.metaTop}>
        <Text style={styles.metaLabel}>Stanza</Text>
        <Text style={styles.metaValue}>{roomId}</Text>
      </View>
      <View style={styles.metaTopRight}>
        <Text style={styles.metaLabel}>Giocatori</Text>
        <Text style={styles.metaValue}>{playerCount}</Text>
      </View>

      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.title}>PAROLE DEGLI ALTRI</Text>
            <Text style={styles.subtitle}>
              {displayMode === 'blurred'
                ? 'Fai domande sì/no per indovinare la tua. Tieni premuto su un giocatore per vedere la sua parola.'
                : 'Fai domande sì/no per indovinare la tua.'}
            </Text>

            <View style={styles.modeToggle}>
              <ModeToggleOption
                label="Nascoste"
                active={displayMode === 'blurred'}
                onPress={() => {
                  setDisplayMode('blurred');
                  setRevealedUid(null);
                }}
              />
              <ModeToggleOption
                label="Visibili"
                active={displayMode === 'visible'}
                onPress={() => setDisplayMode('visible')}
              />
            </View>

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

            {firstPlayerName && otherPlayers.length > 0 && (
              <Text style={styles.startsLine}>
                Inizia:{' '}
                <Text style={styles.startsName}>
                  {firstIsMe ? `${firstPlayerName} (tu)` : firstPlayerName}
                </Text>
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.card, styles.revealCard]}>
        <View style={styles.cardInner}>
          <Button
            onPress={handleReveal}
            variant="danger"
            size="lg"
            leftIcon={<WarningIcon size={22} color={colors.textPrimary} />}
          >
            Rivela parola
          </Button>
          <Text style={styles.actionHint}>
            Mostrerà la TUA parola — non guardare lo schermo!
          </Text>
        </View>
      </View>
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

  const players = Object.entries(roomData.players || {});
  const totalPlayers = players.length;
  const submittedCount = players.filter(
    ([, p]) => !!(p as IndovinaPlayerState).submittedWord
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
          <View style={styles.cardInner}>
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
        </View>
      </ScrollView>
    </View>
  );
}

interface ModeToggleOptionProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModeToggleOption({ label, active, onPress }: ModeToggleOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.modeToggleSegment, active && styles.modeToggleSegmentActive]}
    >
      <Text
        style={[styles.modeToggleLabel, active && styles.modeToggleLabelActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CountdownView({ value, onCancel }: { value: number; onCancel: () => void }) {
  const display = value > 0 ? value : 1;
  const lastTapRef = useRef(0);
  const handleScreenTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      lastTapRef.current = 0;
      onCancel();
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.mineContainer}>
        <Pressable
          style={[styles.mineCenterWrap, styles.tapTarget]}
          onPress={handleScreenTap}
        >
          <Text style={styles.countdownHint}>Preparati a mostrare la parola...</Text>
          <Text style={styles.countdownNumber} allowFontScaling={false}>
            {display}
          </Text>
        </Pressable>

        <View style={styles.hideButtonContainer}>
          <TouchableOpacity onPress={onCancel} style={styles.hideButton} activeOpacity={0.7}>
            <EyeOffIcon size={18} color={colors.textPrimary} />
            <Text style={styles.hideButtonText}>Nascondi</Text>
          </TouchableOpacity>
          <Text style={styles.hideHint}>oppure doppio tap sullo schermo</Text>
        </View>
      </View>
    </Modal>
  );
}

function MineView({ word, onBack }: { word: string; onBack: () => void }) {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);

  const lastTapRef = useRef(0);
  const handleScreenTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      lastTapRef.current = 0;
      onBack();
      return;
    }
    lastTapRef.current = now;
  };

  // The word is displayed along the LONG visible axis of the screen.
  // - In portrait: rotated 90° so the long axis is vertical (top→bottom).
  // - In landscape: no rotation, long axis is horizontal.
  // Binary-search the largest font that still fits both axes after a greedy
  // word-wrap — closed-form area estimates under-count the space "wasted" at
  // the end of each wrapped line, which caused clipping on 3-line words.
  const charDensity = 0.6;       // avg char width / fontSize
  const lineHeightFactor = 1.3;  // text line-height / fontSize
  const longAxisUsable = 0.92;   // % of long side
  const shortAxisUsable = 0.6;   // % of short side (leaves room for button)

  const wordsArr = word.split(/\s+/).filter(Boolean);
  const longestWordLen = wordsArr.reduce((max, w) => Math.max(max, w.length), 1);
  const maxLineWidth = longSide * longAxisUsable;
  const maxBlockHeight = shortSide * shortAxisUsable;

  const countLines = (fontSize: number): number => {
    const charW = fontSize * charDensity;
    let lines = 1;
    let used = 0;
    for (const w of wordsArr) {
      const wWidth = w.length * charW;
      const spaceWidth = used > 0 ? charW : 0;
      if (used + spaceWidth + wWidth <= maxLineWidth) {
        used += spaceWidth + wWidth;
      } else {
        lines++;
        used = wWidth;
      }
    }
    return lines;
  };

  const fits = (fontSize: number): boolean => {
    const charW = fontSize * charDensity;
    if (longestWordLen * charW > maxLineWidth) return false;
    const lines = countLines(fontSize);
    return lines * fontSize * lineHeightFactor <= maxBlockHeight;
  };

  let lo = 28;
  let hi = 320;
  let best = 28;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const wordFontSize = best;

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onBack}
      statusBarTranslucent
    >
      <View style={styles.mineContainer}>
        <Pressable
          style={[styles.mineCenterWrap, styles.tapTarget]}
          onPress={handleScreenTap}
        >
          <Text
            style={[
              styles.mineWord,
              {
                fontSize: wordFontSize,
                lineHeight: wordFontSize * lineHeightFactor,
                transform: isPortrait ? [{ rotate: '90deg' }] : undefined,
              },
            ]}
            allowFontScaling={false}
          >
            {capitalize(word)}
          </Text>
        </Pressable>

        <View style={styles.hideButtonContainer}>
          <TouchableOpacity onPress={onBack} style={styles.hideButton} activeOpacity={0.7}>
            <EyeOffIcon size={18} color={colors.textPrimary} />
            <Text style={styles.hideButtonText}>Nascondi</Text>
          </TouchableOpacity>
          <Text style={styles.hideHint}>oppure doppio tap sullo schermo</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  metaTop: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 1,
  },
  metaTopRight: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  metaValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  cardInner: {
    paddingTop: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeToggleSegment: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeToggleSegmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  modeToggleLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeToggleLabelActive: {
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm + 2,
  },
  startsLine: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
  startsName: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  empty: {
    color: colors.textMuted,
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
    fontWeight: '700',
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
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
    fontWeight: '700',
    ...Platform.select({
      web: {
        whiteSpace: 'normal' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'break-word' as const,
      },
    }),
  },
  rowWord: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
    width: '100%',
    ...Platform.select({
      web: {
        whiteSpace: 'normal' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'break-word' as const,
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
  revealCard: {
    marginTop: spacing.sm,
  },
  actionHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  waitingTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  countdownHint: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0.5,
  },
  countdownNumber: {
    color: colors.textPrimary,
    fontSize: 180,
    fontWeight: '900',
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
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  hideButtonContainer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  hideButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  hideHint: {
    color: colors.textMuted,
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
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  submittedValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl + 6,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submittedHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  progressText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    fontWeight: '700',
  },
});
