import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { CoreRoom } from '../types/room';
import { removePlayerFromRoom, deleteRoom, resetPlayersToCore } from '../services/roomService';
import { getGame } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { Button, Card, colors, radius, spacing, fontSize } from '../ui';
import GameSelector from './GameSelector';

const WEB_PAGE_URL = 'https://impostore-c0ef1.web.app';

interface LobbyScreenProps {
  roomData: CoreRoom;
  hostId: string;
  onStartGame: () => void;
  onRoomDeleted: () => void;
  loading: boolean;
  gameSettings: unknown;
  onSettingsChange: (settings: unknown) => void;
}

export default function LobbyScreen({
  roomData,
  hostId,
  onStartGame,
  onRoomDeleted,
  loading,
  gameSettings,
  onSettingsChange,
}: LobbyScreenProps) {
  const roomId = roomData.id;
  const roomUrl = `${WEB_PAGE_URL}?room=${roomId}`;
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const gamePlugin = getGame(roomData.currentGameId);
  const SettingsPanel = gamePlugin.SettingsPanel;
  const minPlayers = gamePlugin.minPlayers;

  const getPlayerCount = () => Object.keys(roomData.players || {}).length;

  const handleCopyLink = () => {
    Clipboard.setStringAsync(roomUrl);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({ message: `Unisciti alla stanza: ${roomUrl}`, url: roomUrl });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemovePlayer = async (uid: string) => {
    await removePlayerFromRoom(roomId, uid);
  };

  const handleChangeGame = async (newPlugin: GamePlugin) => {
    if (newPlugin.id === roomData.currentGameId) return;
    const defaults = newPlugin.getDefaultSettings();
    await resetPlayersToCore(roomId);
    await newPlugin.initGameState(roomId, defaults);
    onSettingsChange(defaults);
  };

  const handleDeleteRoom = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler eliminare la stanza?')) {
        deleteRoom(roomId).then(() => onRoomDeleted());
      }
    } else {
      Alert.alert(
        'Elimina Stanza',
        'Tutti i giocatori verranno disconnessi. Sei sicuro?',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: async () => {
              await deleteRoom(roomId);
              onRoomDeleted();
            },
          },
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{`Stanza: ${roomId}`}</Text>

        <Card>
          <Text style={styles.status}>Status: In attesa</Text>
          <Text style={styles.playerCount}>Giocatori: {getPlayerCount()}</Text>

          {roomData.players && Object.keys(roomData.players).length > 0 && (
            <View style={styles.playersListSection}>
              <Text style={styles.label}>Giocatori nella stanza:</Text>
              {Object.entries(roomData.players).map(([uid, player]) => (
                <View key={uid} style={styles.playerItemContainer}>
                  <View style={styles.playerRow}>
                    <Text style={styles.playerName}>
                      {uid === hostId ? <Text style={styles.youBadge}>Tu</Text> : (player.name || 'Senza nome')}
                    </Text>
                    {uid === hostId && <Text style={styles.hostBadge}>Host</Text>}
                  </View>
                  {uid !== hostId && (
                    <TouchableOpacity onPress={() => handleRemovePlayer(uid)} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Scansiona il QR Code per unirti:</Text>
            <View style={styles.qrContainer}>
              <QRCode value={roomUrl} size={200} backgroundColor="white" color="black" />
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <View style={styles.secondaryButtonsRow}>
              <Button onPress={handleCopyLink} variant="secondary" style={styles.rowButton}>
                Copia Link
              </Button>
              <Button onPress={handleShareLink} variant="secondary" style={styles.rowButton}>
                Condividi
              </Button>
            </View>

            <Button
              onPress={onStartGame}
              disabled={loading || getPlayerCount() < minPlayers}
              variant="primary"
              style={styles.stackedButton}
            >
              {loading ? 'Avvio...' : 'Avvia Partita'}
            </Button>

            <Button
              onPress={() => setShowSettingsModal(true)}
              variant="secondary"
              style={styles.stackedButton}
            >
              Impostazioni Stanza
            </Button>

            <Button
              onPress={handleDeleteRoom}
              variant="dangerOutline"
              style={styles.stackedButton}
            >
              Elimina Stanza
            </Button>
          </View>
        </Card>
      </ScrollView>

      {showSettingsModal && (
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Card>
              <Text style={styles.modalTitle}>Modifica Impostazioni</Text>

              <GameSelector
                selectedId={roomData.currentGameId}
                onSelect={handleChangeGame}
                label="Cambia Gioco"
              />

              <SettingsPanel settings={gameSettings} onSettingsChange={onSettingsChange} />

              <Button
                onPress={() => setShowSettingsModal(false)}
                variant="primary"
                style={{ marginTop: spacing.xl }}
              >
                Chiudi
              </Button>
            </Card>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  status: { color: colors.textPrimary, fontSize: fontSize.md },
  playerCount: { color: colors.textPrimary, fontSize: fontSize.md, marginBottom: 15 },
  playersListSection: { marginBottom: spacing.xl },
  label: { color: colors.textSecondary, marginBottom: spacing.sm + 2 },
  playerItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center' },
  playerName: { color: colors.textPrimary, fontSize: fontSize.md },
  youBadge: { color: '#3b82f6', fontWeight: 'bold' },
  hostBadge: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  removeButton: { padding: spacing.xs },
  removeButtonText: { color: colors.danger, fontSize: fontSize.md },
  qrSection: { alignItems: 'center', marginVertical: spacing.xl },
  qrLabel: { color: colors.textPrimary, marginBottom: spacing.sm + 2 },
  qrContainer: { padding: spacing.sm + 2, backgroundColor: 'white', borderRadius: radius.sm },
  buttonsContainer: { marginTop: spacing.xl },
  secondaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: spacing.sm + 2,
  },
  rowButton: { flex: 1 },
  stackedButton: { marginBottom: spacing.sm + 2 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
