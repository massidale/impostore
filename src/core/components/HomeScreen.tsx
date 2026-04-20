import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { Button, Card, Input, colors, spacing, fontSize } from '../ui';
import GameSelector from './GameSelector';

interface HomeScreenProps {
  onCreateRoom: (gameId: string, settings: unknown, hostName: string) => void;
  loading: boolean;
}

/**
 * Home screen — game selection + settings configuration.
 * Discovers available games from the Game Registry and renders
 * each plugin's SettingsPanel.
 */
export default function HomeScreen({ onCreateRoom, loading }: HomeScreenProps) {
  const games = getAllGames();
  const [selectedGame, setSelectedGame] = useState<GamePlugin>(games[0]);
  const [gameSettings, setGameSettings] = useState<unknown>(selectedGame.getDefaultSettings());
  const [hostName, setHostName] = useState('');

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
            onChangeText={setHostName}
            maxLength={15}
          />
        </Card>

        <GameSelector selectedId={selectedGame.id} onSelect={handleSelectGame} />

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
  disabledHelper: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
