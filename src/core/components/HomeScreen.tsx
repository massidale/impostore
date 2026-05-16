import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAllGames } from '../gameRegistry';
import { GamePlugin } from '../types/gamePlugin';
import {
  Button,
  ErrorBanner,
  GameCard,
  Input,
  SectionHeader,
  Sheet,
  colors,
  fonts,
  fontSize,
  spacing,
} from '../ui';

interface HomeScreenProps {
  onCreateRoom: (gameId: string, settings: unknown, hostName: string) => void;
  loading: boolean;
  hostName: string;
  onHostNameChange: (name: string) => void;
  createRoomError?: string | null;
  onDismissCreateRoomError?: () => void;
}

/**
 * Home screen — hero gallery of available games. Tap a game to open a
 * bottom sheet with name input, settings panel and "Crea Stanza" CTA.
 *
 * The room is the central concept; choosing a game here is just a starting
 * point — it can be changed later from the lobby.
 */
export default function HomeScreen({
  onCreateRoom,
  loading,
  hostName,
  onHostNameChange,
  createRoomError,
  onDismissCreateRoomError,
}: HomeScreenProps) {
  const games = useMemo(() => getAllGames(), []);
  const [selectedGame, setSelectedGame] = useState<GamePlugin | null>(null);
  const [gameSettings, setGameSettings] = useState<unknown>(null);

  const handleOpenGame = (game: GamePlugin) => {
    setSelectedGame(game);
    setGameSettings(game.getDefaultSettings());
  };

  const handleClose = () => {
    setSelectedGame(null);
  };

  const trimmedName = hostName.trim();
  const canCreate = !loading && trimmedName.length > 0 && selectedGame !== null;

  const handleCreate = () => {
    if (!selectedGame || !canCreate) return;
    onCreateRoom(selectedGame.id, gameSettings, trimmedName);
  };

  const SettingsPanel = selectedGame?.SettingsPanel;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Crea una stanza, invita gli amici{'\n'}e scegli un gioco.
        </Text>

        {createRoomError ? (
          <ErrorBanner
            message={createRoomError}
            onDismiss={onDismissCreateRoomError}
            style={{ marginBottom: spacing.lg }}
          />
        ) : null}

        <SectionHeader label="Catalogo giochi" />
        <View style={styles.gallery}>
          {games.map((game) => (
            <GameCard
              key={game.id}
              icon={game.icon || '🎲'}
              name={game.name}
              description={game.description}
              minPlayers={game.minPlayers}
              maxPlayers={game.maxPlayers}
              onPress={() => handleOpenGame(game)}
            />
          ))}
        </View>
      </ScrollView>

      <Sheet
        visible={selectedGame !== null}
        onClose={handleClose}
        title={selectedGame ? `Nuova partita · ${selectedGame.name}` : ''}
        footer={
          selectedGame ? (
            <View>
              <Button
                onPress={handleCreate}
                disabled={!canCreate}
                variant="primary"
                size="lg"
              >
                {loading ? 'Creazione…' : 'Crea Stanza'}
              </Button>
              {!canCreate && !loading ? (
                <Text style={styles.helper}>
                  Inserisci il tuo nome per continuare
                </Text>
              ) : null}
            </View>
          ) : null
        }
      >
        {selectedGame && SettingsPanel ? (
          <View>
            <SectionHeader label="Il tuo nome" />
            <Input
              placeholder="Es. Mario"
              value={hostName}
              onChangeText={onHostNameChange}
              maxLength={15}
              autoFocus
            />

            <View style={styles.settingsBlock}>
              <SectionHeader label="Impostazioni" />
              <SettingsPanel
                settings={gameSettings}
                onSettingsChange={setGameSettings}
              />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  intro: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  gallery: {
    gap: spacing.md,
  },
  settingsBlock: {
    marginTop: spacing.xl,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
