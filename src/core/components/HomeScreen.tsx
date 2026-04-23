import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { Button, Card, Input, colors, radius, spacing, fontSize } from '../ui';
import GamePickerModal from './GamePickerModal';

interface HomeScreenProps {
  onCreateRoom: (gameId: string, settings: unknown, hostName: string) => void;
  loading: boolean;
  hostName: string;
  onHostNameChange: (name: string) => void;
}

/**
 * Home screen — game selection + settings configuration.
 * Discovers available games from the Game Registry and renders
 * each plugin's SettingsPanel.
 */
export default function HomeScreen({
  onCreateRoom,
  loading,
  hostName,
  onHostNameChange,
}: HomeScreenProps) {
  const games = getAllGames();
  const [selectedGame, setSelectedGame] = useState<GamePlugin>(games[0]);
  const [gameSettings, setGameSettings] = useState<unknown>(selectedGame.getDefaultSettings());
  const [showGamePickerModal, setShowGamePickerModal] = useState(false);

  const handleSelectGame = (game: GamePlugin) => {
    setSelectedGame(game);
    setGameSettings(game.getDefaultSettings());
  };

  const SettingsPanel = selectedGame.SettingsPanel;
  const trimmedName = hostName.trim();
  const canCreate = !loading && trimmedName.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Crea Stanza</Text>

        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={styles.fieldLabel}>Il tuo nome</Text>
          <Input
            placeholder="Es. Mario"
            value={hostName}
            onChangeText={onHostNameChange}
            maxLength={15}
          />
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={styles.sectionLabel}>Gioco</Text>
          <View style={styles.currentGamePreview}>
            <Text style={styles.currentGameEmoji}>
              {selectedGame.icon || '🎲'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentGameName}>{selectedGame.name}</Text>
              {selectedGame.description ? (
                <Text style={styles.currentGameDescription}>
                  {selectedGame.description}
                </Text>
              ) : null}
              <Text style={styles.currentGameMeta}>
                {selectedGame.minPlayers}+ giocatori
              </Text>
            </View>
          </View>
          <Button
            onPress={() => setShowGamePickerModal(true)}
            variant="secondary"
          >
            Cambia gioco
          </Button>
        </Card>

        <Card>
          <SettingsPanel
            settings={gameSettings}
            onSettingsChange={setGameSettings}
          />
        </Card>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <Button
          onPress={() => onCreateRoom(selectedGame.id, gameSettings, trimmedName)}
          disabled={!canCreate}
          variant="primary"
          size="lg"
        >
          {loading ? 'Creazione...' : 'Crea Stanza'}
        </Button>
        {!canCreate && !loading && (
          <Text style={styles.disabledHelper}>
            Inserisci il tuo nome per continuare
          </Text>
        )}
      </View>

      <GamePickerModal
        visible={showGamePickerModal}
        selectedId={selectedGame.id}
        onSelect={handleSelectGame}
        onClose={() => setShowGamePickerModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { padding: spacing.xl },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  bottomButtonContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 16,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  currentGamePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  currentGameEmoji: {
    fontSize: 32,
  },
  currentGameName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  currentGameDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  currentGameMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disabledHelper: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
