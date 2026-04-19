import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { CoreRoom } from '../types/room';
import { addPlayerToRoom, NameTakenError } from '../services/roomService';
import { getGame } from '../gameRegistry';
import { Button, Card, Input, colors, spacing, fontSize } from '../ui';

interface WebPlayerScreenProps {
  roomData: CoreRoom;
  roomId: string;
  /** UID from Firebase Anonymous Auth — shared with the MainScreen */
  playerUid: string;
}

export default function WebPlayerScreen({ roomData, roomId, playerUid }: WebPlayerScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomData?.players && roomData.players[playerUid]) {
      setHasJoined(true);
    }
  }, [roomData?.players, playerUid]);

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await addPlayerToRoom(roomId, playerUid, playerName.trim());
      setHasJoined(true);
    } catch (e) {
      if (e instanceof NameTakenError) {
        setError(e.message);
      } else {
        console.error('Join error', e);
        setError('Errore durante l\'ingresso. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Join screen
  if (!hasJoined) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={styles.title}>Entra nella stanza</Text>
          <Text style={styles.subtitle}>ID: {roomId}</Text>

          <Input
            placeholder="Il tuo nome (es. Mario)"
            value={playerName}
            onChangeText={(text) => {
              setPlayerName(text);
              if (error) setError(null);
            }}
            maxLength={15}
            style={{ marginBottom: error ? spacing.sm : spacing.xl }}
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Button
            onPress={handleJoin}
            disabled={loading || !playerName.trim()}
            variant="success"
            size="lg"
          >
            {loading ? 'Entrando...' : 'Entra'}
          </Button>
        </Card>
      </View>
    );
  }

  // 2. Waiting in lobby
  if (roomData.status === 'lobby') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={[styles.title, { marginTop: spacing.xl }]}>In attesa dell'Host...</Text>
        <Text style={styles.subtitle}>Guarda lo schermo principale per vedere chi entra!</Text>
      </View>
    );
  }

  // 3. Active game — delegate to plugin
  if (roomData.status === 'active') {
    try {
      const plugin = getGame(roomData.currentGameId);
      const PlayerGamepad = plugin.PlayerGamepad;
      return (
        <SafeAreaView style={styles.activeContainer}>
          <PlayerGamepad roomData={roomData} playerId={playerUid} />
        </SafeAreaView>
      );
    } catch {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Gioco non supportato</Text>
          <Text style={styles.subtitle}>Il gioco "{roomData.currentGameId}" non è disponibile.</Text>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gioco in corso...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  activeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
