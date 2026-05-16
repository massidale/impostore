import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { CoreRoom, CorePlayer } from '../types/room';
import { addPlayerToRoom, NameTakenError } from '../services/roomService';
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
  fonts,
  fontSize,
  radius,
  spacing,
} from '../ui';

interface WebPlayerScreenProps {
  roomData: CoreRoom;
  roomId: string;
  /** Stable per-device player identity (NOT the Firebase Auth UID). */
  clientId: string;
}

export default function WebPlayerScreen({ roomData, roomId, clientId }: WebPlayerScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedAutoRejoin = useRef(false);

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
      if (!saved?.name) return;
      setPlayerName(saved.name);
      try {
        await addPlayerToRoom(roomId, clientId, saved.name);
        setHasJoined(true);
      } catch (e) {
        if (e instanceof NameTakenError) {
          setError(
            `Il nome "${saved.name}" è già usato nella stanza. Scegline un altro per entrare.`
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
            placeholder="Es. Mario"
            value={playerName}
            onChangeText={(text) => {
              setPlayerName(text);
              if (error) setError(null);
            }}
            maxLength={15}
            autoFocus
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
                    isHost={uid === roomData.hostId}
                    isMe={uid === clientId}
                  />
                </View>
              );
            })}
            {me ? null : <PlayerSlotEmpty label="Connessione" index={0} />}
          </View>
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
          </Card>
        </ScrollView>
      );
    }

    try {
      const plugin = getGame(roomData.currentGameId);
      const PlayerGamepad = plugin.PlayerGamepad;
      return (
        <SafeAreaView style={styles.activeContainer}>
          <PlayerGamepad roomData={roomData} playerId={clientId} />
        </SafeAreaView>
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
