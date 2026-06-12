import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { CoreRoom, CorePlayer } from '../types/room';
import {
  addPlayerToRoom,
  removePlayerFromRoom,
  NameTakenError,
} from '../services/roomService';
import { sessionStore } from '../services/sessionStorage';
import { getGame } from '../gameRegistry';
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  PlayerSlot,
  PlayerSlotEmpty,
  SectionHeader,
  colors,
  confirmDialog,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../ui';

interface WebPlayerScreenProps {
  roomData: CoreRoom;
  roomId: string;
  /** Stable player identity: account UID when registered, device clientId otherwise. */
  clientId: string;
  /**
   * Name carried over from the landing screen or the account nickname —
   * joins the room automatically without asking again.
   */
  defaultName?: string | null;
  /** Called after the player voluntarily leaves the room. */
  onLeave?: () => void;
}

export default function WebPlayerScreen({
  roomData,
  roomId,
  clientId,
  defaultName,
  onLeave,
}: WebPlayerScreenProps) {
  const [playerName, setPlayerName] = useState(defaultName ?? '');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedAutoRejoin = useRef(false);
  const leaving = useRef(false);

  // Kicked by the host: my player record disappeared while I was in the
  // room. Drop back to the join screen (and forget the saved session, or a
  // page refresh would silently re-join, undoing the removal).
  useEffect(() => {
    if (!hasJoined || leaving.current) return;
    if (!roomData?.players) return;
    if (roomData.players[clientId]) return;
    setHasJoined(false);
    setPlayerName('');
    setError("Sei stato rimosso dalla stanza dall'host.");
    sessionStore.clearRoomSession(roomId).catch(() => {});
  }, [hasJoined, roomData?.players, clientId, roomId]);

  useEffect(() => {
    if (hasJoined || attemptedAutoRejoin.current) return;
    const alreadyIn = !!roomData?.players?.[clientId];
    if (alreadyIn) {
      attemptedAutoRejoin.current = true;
      setHasJoined(true);
      return;
    }
    if (!roomData?.players) return;
    attemptedAutoRejoin.current = true;
    (async () => {
      const saved = await sessionStore.getRoomSession(roomId);
      // Test hook (web): `?name=Mario` pre-fills the name and joins
      // automatically on first visit — used by scripts/dev-multi.sh.
      const urlName =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('name')?.trim()
          : undefined;
      const name = saved?.name || urlName || defaultName?.trim();
      if (!name) return;
      setPlayerName(name);
      try {
        await addPlayerToRoom(roomId, clientId, name);
        await sessionStore.setRoomSession(roomId, { name });
        setHasJoined(true);
      } catch (e) {
        if (e instanceof NameTakenError) {
          setError(
            `Il nome "${name}" è già usato nella stanza. Scegline un altro per entrare.`
          );
        }
      }
    })();
  }, [roomData?.players, clientId, roomId, hasJoined]);

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const name = playerName.trim();
      await addPlayerToRoom(roomId, clientId, name);
      await sessionStore.setRoomSession(roomId, { name });
      setHasJoined(true);
    } catch (e) {
      if (e instanceof NameTakenError) {
        setError(e.message);
      } else {
        console.error('Join error', e);
        setError("Errore durante l'ingresso. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirmDialog({
      title: 'Abbandona la stanza',
      message: 'Vuoi davvero uscire da questa stanza?',
      confirmLabel: 'Abbandona',
      destructive: true,
    });
    if (!ok) return;
    leaving.current = true;
    try {
      await removePlayerFromRoom(roomId, clientId);
    } catch {
      // Even if the write fails (room already gone), drop out locally.
    }
    sessionStore.clearRoomSession(roomId).catch(() => {});
    onLeave?.();
  };

  const leaveButton = onLeave ? (
    <Button
      onPress={handleLeave}
      variant="dangerOutline"
      size="sm"
      style={{ marginTop: spacing.xl }}
    >
      Abbandona la stanza
    </Button>
  ) : null;

  // 1. Join screen
  if (!hasJoined) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.label}>Stai entrando in una stanza</Text>
          <Text style={styles.roomCode}>{roomId}</Text>

          <SectionHeader label="Il tuo nome" style={{ marginTop: spacing.xl }} />
          <Input
            placeholder="es. Mario"
            value={playerName}
            onChangeText={(text) => {
              setPlayerName(text);
              if (error) setError(null);
            }}
            maxLength={15}
          />

          {error ? (
            <ErrorBanner message={error} style={{ marginTop: spacing.md }} />
          ) : null}

          <Button
            onPress={handleJoin}
            disabled={loading || !playerName.trim()}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl }}
          >
            {loading ? 'Entrando…' : 'Entra'}
          </Button>

          {onLeave ? (
            <Button
              onPress={onLeave}
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.md }}
            >
              Torna alla home
            </Button>
          ) : null}
        </Card>
      </ScrollView>
    );
  }

  // 2. Waiting in lobby — show other players + own slot
  if (roomData.status === 'lobby') {
    const players = Object.entries(roomData.players || {});
    const me = roomData.players?.[clientId];
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.label}>Stanza</Text>
          <Text style={styles.roomCode}>{roomId}</Text>
          <Text style={styles.waitingTitle}>In attesa dell'host</Text>
          <Text style={styles.waitingSubtitle}>
            La partita partirà da un momento all'altro.
          </Text>

          <View style={styles.divider} />

          <SectionHeader label={`Giocatori connessi · ${players.length}`} />
          <View style={styles.playersBlock}>
            {players.map(([uid, player], i) => {
              const isLast = i === players.length - 1 && !!me;
              return (
                <View
                  key={uid}
                  style={!isLast ? styles.playerRowDivider : undefined}
                >
                  <PlayerSlot
                    uid={uid}
                    name={player.name || 'Senza nome'}
                    // `hostId` is the host's AUTH uid while players are keyed
                    // by clientId — the only reliable marker is the isHost flag.
                    isHost={player.isHost === true}
                    isMe={uid === clientId}
                  />
                </View>
              );
            })}
            {me ? null : <PlayerSlotEmpty label="Connessione" index={0} />}
          </View>

          {leaveButton}
        </Card>
      </ScrollView>
    );
  }

  // 3. Active game
  if (roomData.status === 'active') {
    const myRecord = roomData.players?.[clientId] as CorePlayer | undefined;
    if (myRecord?.waiting) {
      return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Text style={styles.label}>Stanza</Text>
            <Text style={styles.roomCode}>{roomId}</Text>
            <Text style={styles.waitingTitle}>Partita in corso</Text>
            <Text style={styles.waitingSubtitle}>
              Entrerai automaticamente nel prossimo round.
            </Text>
            <View style={styles.divider} />
            <PlayerSlotEmpty label="Pronto al prossimo round" index={0} />
            {leaveButton}
          </Card>
        </ScrollView>
      );
    }

    try {
      const plugin = getGame(roomData.currentGameId);
      const PlayerGamepad = plugin.PlayerGamepad;
      return (
        // Plain View: this sits inside MainScreen's SafeAreaView — a nested
        // SafeAreaView would apply the device insets a second time.
        <View style={styles.activeContainer}>
          <PlayerGamepad roomData={roomData} playerId={clientId} />
        </View>
      );
    } catch {
      return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Text style={styles.errTitle}>Gioco non supportato</Text>
            <Text style={styles.waitingSubtitle}>
              Il gioco "{roomData.currentGameId}" non è disponibile su questo client.
            </Text>
          </Card>
        </ScrollView>
      );
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Text style={styles.waitingTitle}>Caricamento…</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  activeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    paddingVertical: spacing.xl,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  roomCode: {
    color: colors.primaryLight,
    fontFamily: fonts.code,
    fontSize: fontSize.xl,
    letterSpacing: 1.5,
    marginTop: 4,
    fontWeight: '700',
  },
  waitingTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xxl,
    letterSpacing: -0.5,
    marginTop: spacing.lg,
  },
  waitingSubtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  errTitle: {
    color: colors.danger,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: spacing.xl,
  },
  playersBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
