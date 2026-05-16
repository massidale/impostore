import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  useWindowDimensions,
  Share,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { CoreRoom } from '../types/room';
import {
  removePlayerFromRoom,
  deleteRoom,
  resetPlayersToCore,
} from '../services/roomService';
import { getGame, getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import {
  Button,
  ErrorBanner,
  GameCard,
  Pill,
  PlayerSlot,
  PlayerSlotEmpty,
  SectionHeader,
  Sheet,
  Toast,
  colors,
  confirmDialog,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../ui';

const WEB_PAGE_URL = 'https://gameshub-6b1ce.web.app';

interface LobbyScreenProps {
  roomData: CoreRoom;
  hostId: string;
  onStartGame: () => void;
  onRoomDeleted: () => void;
  loading: boolean;
  gameSettings: unknown;
  onSettingsChange: (settings: unknown) => void;
  startGameError?: string | null;
  onDismissStartGameError?: () => void;
}

type OpenSheet = 'settings' | 'qr' | null;

const CopyIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={9} y={9} width={13} height={13} rx={2} ry={2} stroke={colors.textPrimary} strokeWidth={2} />
    <Path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      stroke={colors.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShareIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
      stroke={colors.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 6l-4-4-4 4"
      stroke={colors.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2v13"
      stroke={colors.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const QrIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={7} height={7} stroke={colors.textPrimary} strokeWidth={2} />
    <Rect x={14} y={3} width={7} height={7} stroke={colors.textPrimary} strokeWidth={2} />
    <Rect x={3} y={14} width={7} height={7} stroke={colors.textPrimary} strokeWidth={2} />
    <Path
      d="M14 14h3v3h-3z M20 14v3 M14 20h3 M20 20v1"
      stroke={colors.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

interface IconButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  label: string;
}

const IconButton = ({ onPress, children, label }: IconButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.iconButton}
    accessibilityLabel={label}
  >
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
  startGameError,
  onDismissStartGameError,
}: LobbyScreenProps) {
  const roomId = roomData.id;
  const roomUrl = `${WEB_PAGE_URL}?room=${roomId}`;
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const qrSize = Math.min(screenWidth - spacing.xl * 4, 280);

  useEffect(() => {
    if (!linkCopied) return;
    const t = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(t);
  }, [linkCopied]);

  const gamePlugin = getGame(roomData.currentGameId);
  const SettingsPanel = gamePlugin.SettingsPanel;
  const minPlayers = gamePlugin.minPlayers;

  const players = useMemo(
    () => Object.entries(roomData.players || {}),
    [roomData.players]
  );
  const playerCount = players.length;
  const emptySlots = Math.max(0, minPlayers - playerCount);

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(roomUrl);
    setLinkCopied(true);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Unisciti alla mia partita su gamesHub: ${roomUrl}`,
        url: roomUrl,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemovePlayer = async (uid: string) => {
    const player = roomData.players?.[uid];
    const name = player?.name?.trim() || 'questo giocatore';
    const ok = await confirmDialog({
      title: 'Rimuovi giocatore',
      message: `Vuoi rimuovere ${name} dalla stanza?`,
      confirmLabel: 'Rimuovi',
      destructive: true,
    });
    if (!ok) return;
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
    const proceed = async () => {
      await deleteRoom(roomId);
      onRoomDeleted();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler eliminare la stanza?')) proceed();
    } else {
      Alert.alert(
        'Elimina Stanza',
        'Tutti i giocatori verranno disconnessi.',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: proceed },
        ]
      );
    }
  };

  const canStart = !loading && playerCount >= minPlayers;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.roomHeader}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.roomLabel}>Stanza</Text>
            <Text style={styles.roomId}>{roomId}</Text>
          </View>
          <View style={styles.iconActions}>
            <IconButton onPress={handleCopyLink} label="Copia link stanza">
              <CopyIcon />
            </IconButton>
            <IconButton onPress={handleShareLink} label="Condividi link stanza">
              <ShareIcon />
            </IconButton>
            <IconButton onPress={() => setOpenSheet('qr')} label="Mostra QR code">
              <QrIcon />
            </IconButton>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label="In attesa" variant="cyan" />
          <Pill
            label="Impostazioni"
            variant="outline"
            onPress={() => setOpenSheet('settings')}
          />
        </View>

        {startGameError ? (
          <ErrorBanner
            message={startGameError}
            onDismiss={onDismissStartGameError}
            style={{ marginBottom: spacing.lg }}
          />
        ) : null}

        <SectionHeader
          label={`Giocatori · ${playerCount}${
            emptySlots > 0 ? ` di ${minPlayers}` : ''
          }`}
        />
        <View style={styles.playersBlock}>
          {players.map(([uid, player], i) => {
            const isLast = i === players.length - 1 && emptySlots === 0;
            return (
              <View
                key={uid}
                style={!isLast ? styles.playerRowDivider : undefined}
              >
                <PlayerSlot
                  uid={uid}
                  name={player.name || 'Senza nome'}
                  isHost={uid === hostId}
                  isMe={uid === hostId}
                  onRemove={uid !== hostId ? () => handleRemovePlayer(uid) : undefined}
                />
              </View>
            );
          })}
          {Array.from({ length: emptySlots }).map((_, i) => {
            const isLast = i === emptySlots - 1;
            return (
              <View
                key={`empty-${i}`}
                style={!isLast ? styles.playerRowDivider : undefined}
              >
                <PlayerSlotEmpty index={i} />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Button
          onPress={onStartGame}
          disabled={!canStart}
          variant="primary"
          size="lg"
        >
          {loading ? 'Avvio…' : 'Avvia Partita'}
        </Button>
        {!canStart && !loading ? (
          <Text style={styles.helper}>
            {emptySlots > 0
              ? `Servono ancora ${emptySlots} giocator${emptySlots === 1 ? 'e' : 'i'}`
              : 'In attesa…'}
          </Text>
        ) : null}
      </View>

      <Sheet
        visible={openSheet === 'settings'}
        onClose={() => setOpenSheet(null)}
        title="Impostazioni stanza"
        footer={
          <Button onPress={handleDeleteRoom} variant="dangerOutline">
            Elimina stanza
          </Button>
        }
      >
        <SectionHeader label="Gioco" hint="Cambialo quando vuoi: la stanza resta." />
        <View style={styles.gamePickList}>
          {getAllGames().map((g) => (
            <GameCard
              key={g.id}
              icon={g.icon || '🎲'}
              name={g.name}
              description={g.description}
              minPlayers={g.minPlayers}
              maxPlayers={g.maxPlayers}
              selected={g.id === roomData.currentGameId}
              onPress={() => handleChangeGame(g)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        <SectionHeader label={`Impostazioni · ${gamePlugin.name}`} />
        <SettingsPanel
          settings={gameSettings}
          onSettingsChange={handleSettingsChange}
          roomId={roomId}
        />
      </Sheet>

      <Sheet
        visible={openSheet === 'qr'}
        onClose={() => setOpenSheet(null)}
        title="QR code"
      >
        <Text style={styles.qrHint}>
          Inquadra con la fotocamera per unirti alla stanza{' '}
          <Text style={styles.qrCode}>{roomId}</Text>.
        </Text>
        <View style={styles.qrBox}>
          <View style={[styles.qrInner, { width: qrSize + spacing.lg * 2 }]}>
            <QRCode value={roomUrl} size={qrSize} backgroundColor="white" color="black" />
          </View>
        </View>
      </Sheet>

      <Toast visible={linkCopied} message="Link copiato negli appunti" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  roomLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  roomId: {
    color: colors.textPrimary,
    fontFamily: fonts.code,
    fontSize: fontSize.xxl,
    letterSpacing: 2,
    marginTop: 2,
    fontWeight: '700',
  },
  iconActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
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
  stickyFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  gamePickList: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  qrHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  qrCode: {
    color: colors.primaryLight,
    fontFamily: fonts.code,
    letterSpacing: 1,
  },
  qrBox: {
    alignItems: 'center',
  },
  qrInner: {
    padding: spacing.lg,
    backgroundColor: 'white',
    borderRadius: radius.md,
  },
});
