import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { createRoom } from '../core/services/roomService';
import { useRoomData } from '../core/hooks/useRoomData';
import { useAnonymousAuth } from '../core/hooks/useAnonymousAuth';
import { getGame } from '../core/gameRegistry';

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
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isWebPlayer, setIsWebPlayer] = useState(false);
  const { roomData, isFetched } = useRoomData(uid ? roomId : null);
  const [loading, setLoading] = useState(false);
  const [gameSettings, setGameSettings] = useState<unknown>(null);
  const [hostName, setHostName] = useState('');

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

  // Wait for anonymous auth before any DB access
  if (!uid) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const handleCreateRoom = async (gameId: string, settings: unknown, name: string) => {
    setLoading(true);
    try {
      const plugin = getGame(gameId);
      const newRoomId = await createRoom(uid, gameId, name);
      await plugin.initGameState(newRoomId, settings);
      setGameSettings(settings);
      setHostName(name);
      setRoomId(newRoomId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !roomData) return;
    setLoading(true);
    try {
      const plugin = getGame(roomData.currentGameId);
      await plugin.startGame(roomId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Loading state for web player joining via URL
  if (!roomId || !roomData) {
    if (isWebPlayer) {
      return (
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator size="large" color="#2563eb" />
        </SafeAreaView>
      );
    }

    // HomeScreen — game selection + settings
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          loading={loading}
          hostName={hostName}
          onHostNameChange={setHostName}
        />
      </SafeAreaView>
    );
  }

  // Web player flow
  if (isWebPlayer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <WebPlayerScreen roomData={roomData} roomId={roomId} playerUid={uid} />
      </SafeAreaView>
    );
  }

  // Host flow — Lobby
  if (roomData.status === 'lobby') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <LobbyScreen
          roomData={roomData}
          hostId={uid}
          onStartGame={handleStartGame}
          onRoomDeleted={() => setRoomId(null)}
          loading={loading}
          gameSettings={gameSettings}
          onSettingsChange={setGameSettings}
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
          <View style={styles.gameLayout}>
            <View style={styles.gameContent}>
              <PlayerGamepad roomData={roomData} playerId={uid} />
            </View>
            <HostDashboard roomData={roomData} hostId={uid} />
          </View>
        </SafeAreaView>
      );
    } catch {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
        </SafeAreaView>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111827' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  gameLayout: { flex: 1 },
  gameContent: { flex: 1 },
});
