import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import { Button, Card, colors, spacing, fontSize } from '../ui';
import GameSelector from './GameSelector';

interface HomeScreenProps {
  onCreateRoom: (gameId: string, settings: unknown) => void;
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

  const handleSelectGame = (game: GamePlugin) => {
    setSelectedGame(game);
    setGameSettings(game.getDefaultSettings());
  };

  const SettingsPanel = selectedGame.SettingsPanel;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Crea Stanza</Text>

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
          onPress={() => onCreateRoom(selectedGame.id, gameSettings)}
          disabled={loading}
          variant="primary"
        >
          {loading ? 'Creazione...' : 'Crea Stanza'}
        </Button>
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
});
