import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { createRoom } from '../core/services/roomService';
import { useRoomData } from '../core/hooks/useRoomData';
import { useAnonymousAuth } from '../core/hooks/useAnonymousAuth';
import { useClientId } from '../core/hooks/useClientId';
import { getGame } from '../core/gameRegistry';
import { AppHeader, colors } from '../core/ui';

import HomeScreen from '../core/components/HomeScreen';
import LobbyScreen from '../core/components/LobbyScreen';
import WebPlayerScreen from '../core/components/WebPlayerScreen';

/**
 * MainScreen — thin router that orchestrates the app flow:
 *
 * 1. Auth not ready → spinner
 * 2. No room → HomeScreen (game selection + settings)
 * 3. Web player with room URL → WebPlayerScreen
 * 4. Room in lobby → LobbyScreen
 * 5. Room active → Game's HostDashboard + PlayerGamepad (via registry)
 */
export default function MainScreen() {
  const uid = useAnonymousAuth();
  const clientId = useClientId();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isWebPlayer, setIsWebPlayer] = useState(false);
  const { roomData, isFetched } = useRoomData(uid && clientId ? roomId : null);
  const [loading, setLoading] = useState(false);
  const [gameSettings, setGameSettings] = useState<unknown>(null);
  const [hostName, setHostName] = useState('');
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  // If room was deleted externally, reset
  useEffect(() => {
    if (roomId && isFetched && roomData === null) {
      setRoomId(null);
    }
  }, [roomId, roomData, isFetched]);

  // Detect web player mode from URL params
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const room = urlParams.get('room');
      if (room) {
        setRoomId(room);
        setIsWebPlayer(true);
      }
    }
  }, []);

  const handleCreateRoom = async (gameId: string, settings: unknown, name: string) => {
    setLoading(true);
    setCreateRoomError(null);
    try {
      const plugin = getGame(gameId);
      const newRoomId = await createRoom(uid!, clientId!, gameId, name);
      await plugin.initGameState(newRoomId, settings);
      setGameSettings(settings);
      setHostName(name);
      setRoomId(newRoomId);
    } catch (e) {
      console.error(e);
      setCreateRoomError(e instanceof Error ? e.message : 'Impossibile creare la stanza');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !roomData) return;
    setLoading(true);
    setStartGameError(null);
    try {
      const plugin = getGame(roomData.currentGameId);
      await plugin.startGame(roomId);
    } catch (e) {
      console.error(e);
      setStartGameError(e instanceof Error ? e.message : 'Impossibile avviare la partita');
    } finally {
      setLoading(false);
    }
  };

  // Wait for both auth UID (for RTDB rules) and clientId (player identity)
  // before any DB access.
  if (!uid || !clientId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Loading state for web player joining via URL
  if (!roomId || !roomData) {
    if (isWebPlayer) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      );
    }

    // HomeScreen — game selection + settings
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader />
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          loading={loading}
          hostName={hostName}
          onHostNameChange={setHostName}
          createRoomError={createRoomError}
          onDismissCreateRoomError={() => setCreateRoomError(null)}
        />
      </SafeAreaView>
    );
  }

  // Web player flow
  if (isWebPlayer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader compact />
        <WebPlayerScreen roomData={roomData} roomId={roomId} clientId={clientId} />
      </SafeAreaView>
    );
  }

  // Host flow — Lobby
  if (roomData.status === 'lobby') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader />
        <LobbyScreen
          roomData={roomData}
          hostId={clientId}
          onStartGame={handleStartGame}
          onRoomDeleted={() => setRoomId(null)}
          loading={loading}
          gameSettings={gameSettings}
          onSettingsChange={setGameSettings}
          startGameError={startGameError}
          onDismissStartGameError={() => setStartGameError(null)}
        />
      </SafeAreaView>
    );
  }

  // Host flow — Active game (resolved from registry)
  if (roomData.status === 'active') {
    try {
      const plugin = getGame(roomData.currentGameId);
      const HostDashboard = plugin.HostDashboard;
      const PlayerGamepad = plugin.PlayerGamepad;

      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
          <View style={styles.gameLayout}>
            <View style={styles.gameContent}>
              <PlayerGamepad roomData={roomData} playerId={clientId} />
            </View>
            <HostDashboard roomData={roomData} hostId={clientId} />
          </View>
        </SafeAreaView>
      );
    } catch {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
        </SafeAreaView>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameLayout: { flex: 1 },
  gameContent: { flex: 1 },
});
