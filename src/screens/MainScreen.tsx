import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Platform,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { createRoom, fetchRoom } from '../core/services/roomService';
import { sessionStore } from '../core/services/sessionStorage';
import { useRoomData } from '../core/hooks/useRoomData';
import { useAuthUser } from '../core/hooks/useAuthUser';
import { getGame, NO_GAME_ID } from '../core/gameRegistry';
import { AppHeader, Screen, UserIcon, avatarColor, colors, fonts, fontSize, radius } from '../core/ui';
import AccountSheet from '../core/components/AccountSheet';

import LandingScreen from '../core/components/LandingScreen';
import LobbyScreen from '../core/components/LobbyScreen';
import WebPlayerScreen from '../core/components/WebPlayerScreen';

/**
 * MainScreen — thin router that orchestrates the app flow:
 *
 * 1. Auth not ready → spinner
 * 2. No room → LandingScreen (name + join by code / create room immediately;
 *    the game is chosen later from the lobby)
 * 3. Web player with room URL or joined by code → WebPlayerScreen
 * 4. Room in lobby → LobbyScreen
 * 5. Room active → Game's HostDashboard + PlayerGamepad (via registry)
 */
export default function MainScreen() {
  const viewport = useWindowDimensions();
  const landscapeGame = viewport.width >= 650 && viewport.height < 500;
  const authUser = useAuthUser();
  const uid = authUser.uid;
  // Every player is bound to Firebase Auth, including anonymous sessions.
  const identityId = uid;
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isWebPlayer, setIsWebPlayer] = useState(false);
  const { roomData, isFetched } = useRoomData(uid && identityId ? roomId : null);
  const [loading, setLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState<unknown>(null);
  const [playerName, setPlayerName] = useState('');
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  // With an account, the nickname is the account's display name.
  useEffect(() => {
    if (authUser.isRegistered && authUser.displayName && !playerName.trim()) {
      setPlayerName(authUser.displayName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser.isRegistered, authUser.displayName]);

  // Room gone (deleted, expired, or the code never existed) → back to start.
  useEffect(() => {
    if (roomId && isFetched && roomData === null) {
      setRoomId(null);
      sessionStore.clearLastHostedRoom().catch(() => {});
      if (isWebPlayer) {
        setIsWebPlayer(false);
        setJoinError('La stanza non esiste o è stata chiusa. Controlla il codice.');
        if (Platform.OS === 'web') {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [roomId, roomData, isFetched, isWebPlayer]);

  // Host re-entry: a host who closed/lost the tab finds their room again.
  // Restores only if the room still exists and this identity is its host.
  useEffect(() => {
    if (!uid || !identityId || roomId || isWebPlayer) return;
    if (Platform.OS === 'web') {
      // A ?room URL is the guest path — never hijack it.
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return;
    }
    let cancelled = false;
    (async () => {
      const saved = await sessionStore.getLastHostedRoom();
      if (!saved || cancelled) return;
      const room = await fetchRoom(saved).catch(() => null);
      if (cancelled) return;
      if (room && room.players?.[identityId]?.isHost) {
        setRoomId(saved);
      } else {
        sessionStore.clearLastHostedRoom().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once identity is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId, uid]);

  // Detect web player mode from URL params
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const room = urlParams.get('room');
      if (room) {
        setRoomId(room.toUpperCase());
        setIsWebPlayer(true);
      }
    }
  }, []);

  // Keep the URL in sync when a guest joins by code, so a refresh
  // lands back in the same room (same path as the QR link).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isWebPlayer || !roomId || !roomData) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('room') !== roomId) {
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [isWebPlayer, roomId, roomData]);

  const handleJoinByCode = (code: string) => {
    setJoinError(null);
    setIsWebPlayer(true);
    setRoomId(code);
  };

  // The room is created right away, without a game: the host picks one
  // from the lobby (the match can't start until they do).
  const handleCreateRoom = async () => {
    const name = playerName.trim();
    if (!name) return;
    setLoading(true);
    setCreateRoomError(null);
    try {
      const newRoomId = await createRoom(uid!, identityId!, NO_GAME_ID, name);
      await sessionStore.setLastHostedRoom(newRoomId).catch(() => {});
      setGameSettings(null);
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
    if (roomData.currentGameId === NO_GAME_ID) {
      setStartGameError('Scegli un gioco dalle impostazioni prima di avviare.');
      return;
    }
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

  // A guest who taps "Abbandona la stanza" goes back to the landing screen.
  const handleLeftRoom = () => {
    setIsWebPlayer(false);
    setRoomId(null);
    if (Platform.OS === 'web') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('name');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const accountAction = (
    <TouchableOpacity
      onPress={() => setAccountOpen(true)}
      style={styles.accountButton}
      accessibilityLabel="Account"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {authUser.isRegistered ? (
        <View style={[styles.accountAvatar, { backgroundColor: avatarColor(uid || '') }]}>
          <Text style={styles.accountAvatarText}>
            {(authUser.displayName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : (
        <UserIcon size={22} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const accountSheet = (
    <AccountSheet
      visible={accountOpen}
      onClose={() => setAccountOpen(false)}
      authUser={authUser}
    />
  );

  // Wait for both auth UID (for RTDB rules) and the player identity
  // (account UID or device clientId) before any DB access.
  if (!uid || !identityId) {
    return (
      <Screen style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // Loading state for web player joining via URL
  if (!roomId || !roomData) {
    if (isWebPlayer) {
      return (
        <Screen style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </Screen>
      );
    }

    // Landing — name + join by code or create the room right away
    return (
      <Screen style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader actions={accountAction} />
        <LandingScreen
          name={playerName}
          onNameChange={setPlayerName}
          nameLocked={authUser.isRegistered}
          onCreate={handleCreateRoom}
          onJoin={handleJoinByCode}
          creating={loading}
          joining={loading}
          joinError={joinError ?? createRoomError}
          onDismissJoinError={() => {
            setJoinError(null);
            setCreateRoomError(null);
          }}
        />
        {accountSheet}
      </Screen>
    );
  }

  // Web player flow
  if (isWebPlayer) {
    return (
      <Screen style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader compact />
        <WebPlayerScreen
          roomData={roomData}
          roomId={roomId}
          clientId={identityId}
          defaultName={
            authUser.isRegistered ? authUser.displayName : playerName.trim() || null
          }
          onLeave={handleLeftRoom}
        />
      </Screen>
    );
  }

  // Host flow — Lobby
  if (roomData.status === 'lobby') {
    return (
      <Screen style={styles.safeArea}>
        <StatusBar style="light" />
        <AppHeader />
        <LobbyScreen
          roomData={roomData}
          hostId={identityId}
          onStartGame={handleStartGame}
          onRoomDeleted={() => {
            sessionStore.clearLastHostedRoom().catch(() => {});
            setRoomId(null);
          }}
          loading={loading}
          gameSettings={gameSettings}
          onSettingsChange={setGameSettings}
          startGameError={startGameError}
          onDismissStartGameError={() => setStartGameError(null)}
        />
      </Screen>
    );
  }

  // Host flow — Active game (resolved from registry)
  if (roomData.status === 'active') {
    try {
      const plugin = getGame(roomData.currentGameId);
      const HostDashboard = plugin.HostDashboard;
      const PlayerGamepad = plugin.PlayerGamepad;

      return (
        <Screen style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
          <View style={[styles.gameLayout, landscapeGame && styles.gameLandscape]}>
            <View style={styles.gameContent}>
              <PlayerGamepad roomData={roomData} playerId={identityId} />
            </View>
            <ScrollView
              style={landscapeGame ? styles.hostSidebar : styles.hostFooter}
              contentContainerStyle={{flexGrow: 1}}
            >
              <HostDashboard roomData={roomData} hostId={identityId} />
            </ScrollView>
          </View>
        </Screen>
      );
    } catch {
      return (
        <Screen style={styles.safeArea}>
          <StatusBar style="light" />
          <AppHeader compact />
        </Screen>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameLayout: { flex: 1, minHeight: 0, minWidth: 0 },
  gameContent: { flex: 1, minHeight: 0, minWidth: 0 },
  gameLandscape: {flexDirection: 'row'},
  hostSidebar: {width: 230, flexGrow: 0, flexShrink: 0},
  hostFooter: {flexGrow: 0, flexShrink: 0, maxHeight: '35%'},
  accountButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: colors.background,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.sm,
  },
});
