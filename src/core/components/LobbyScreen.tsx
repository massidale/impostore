import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
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

const ICON_COLOR = colors.textPrimary;
const ICON_STROKE = 2;

const CopyIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={9} y={9} width={13} height={13} rx={2} ry={2} stroke={ICON_COLOR} strokeWidth={ICON_STROKE} />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={ICON_COLOR} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke={ICON_COLOR} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 6l-4-4-4 4" stroke={ICON_COLOR} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 2v13" stroke={ICON_COLOR} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const QrIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={7} height={7} stroke={ICON_COLOR} strokeWidth={ICON_STROKE} />
    <Rect x={14} y={3} width={7} height={7} stroke={ICON_COLOR} strokeWidth={ICON_STROKE} />
    <Rect x={3} y={14} width={7} height={7} stroke={ICON_COLOR} strokeWidth={ICON_STROKE} />
    <Path d="M14 14h3v3h-3z M20 14v3 M14 20h3 M20 20v1" stroke={ICON_COLOR} strokeWidth={ICON_STROKE} strokeLinecap="round" />
  </Svg>
);

interface IconButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  label: string;
}

const IconButton = ({ onPress, children, label }: IconButtonProps) => (
  <TouchableOpacity onPress={onPress} style={styles.iconButton} accessibilityLabel={label}>
    {children}
  </TouchableOpacity>
);

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
  const [showQrModal, setShowQrModal] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const qrBoxWidth = Math.min(screenWidth - spacing.xl * 2, 400);
  const qrSize = qrBoxWidth - spacing.lg * 2;

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

  const handleSettingsChange = async (newSettings: unknown) => {
    onSettingsChange(newSettings);
    await gamePlugin.initGameState(roomId, newSettings);
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

  const canStart = !loading && getPlayerCount() >= minPlayers;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>Stanza</Text>
            <Text style={styles.headerRoomId}>{roomId}</Text>
          </View>
          <View style={styles.iconActions}>
            <IconButton onPress={handleCopyLink} label="Copia link stanza">
              <CopyIcon />
            </IconButton>
            <IconButton onPress={handleShareLink} label="Condividi link stanza">
              <ShareIcon />
            </IconButton>
            <IconButton onPress={() => setShowQrModal(true)} label="Mostra QR code">
              <QrIcon />
            </IconButton>
          </View>
        </View>

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
                      {player.name || 'Senza nome'}
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

          <View style={styles.primaryActionContainer}>
            <Button
              onPress={onStartGame}
              disabled={!canStart}
              variant="primary"
              size="lg"
            >
              {loading ? 'Avvio...' : 'Avvia Partita'}
            </Button>
            {!canStart && !loading && (
              <Text style={styles.primaryHelper}>
                Servono almeno {minPlayers} giocatori per iniziare
              </Text>
            )}
          </View>

          <View style={styles.secondaryActionsContainer}>
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
            >
              Elimina Stanza
            </Button>
          </View>
        </Card>
      </ScrollView>

      {showQrModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <Text style={styles.qrModalTitle}>Scansiona per unirti</Text>
            <Text style={styles.qrModalRoomId}>{roomId}</Text>
            <View style={[styles.qrModalContainerInner, { width: qrBoxWidth }]}>
              <QRCode value={roomUrl} size={qrSize} backgroundColor="white" color="black" />
            </View>
            <Button
              onPress={() => setShowQrModal(false)}
              variant="primary"
              style={{ marginTop: spacing.xl, width: qrBoxWidth }}
            >
              Chiudi
            </Button>
          </View>
        </View>
      )}

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

              <SettingsPanel settings={gameSettings} onSettingsChange={handleSettingsChange} />

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerText: { flexShrink: 1 },
  headerLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRoomId: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  iconActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
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
  primaryActionContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  primaryHelper: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  secondaryActionsContainer: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
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
  qrModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrModalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  qrModalRoomId: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
    letterSpacing: 1,
  },
  qrModalContainerInner: {
    padding: spacing.lg,
    backgroundColor: 'white',
    borderRadius: radius.sm,
  },
});
