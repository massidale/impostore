import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { getAllGames } from '../gameRegistry';
import type { GamePlugin } from '../types/gamePlugin';
import {
  Button,
  ErrorBanner,
  GameCard,
  GameRules,
  Input,
  SectionHeader,
  Sheet,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../ui';

interface LandingScreenProps {
  name: string;
  onNameChange: (name: string) => void;
  nameLocked?: boolean;
  onCreate: (gameId: string) => void;
  onJoin: (code: string) => void;
  creating?: boolean;
  joining?: boolean;
  createError?: string | null;
  onDismissCreateError?: () => void;
  joinError?: string | null;
  onDismissJoinError?: () => void;
}

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

/** Browse freely; ask for a nickname only once the player chooses to create or join. */
export default function LandingScreen({
  name,
  onNameChange,
  nameLocked,
  onCreate,
  onJoin,
  creating,
  joining,
  createError,
  onDismissCreateError,
  joinError,
  onDismissJoinError,
}: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const [code, setCode] = useState('');
  const [selectedGame, setSelectedGame] = useState<GamePlugin | null>(null);
  const [creatingSelected, setCreatingSelected] = useState(false);
  const normalized = code.trim().toUpperCase();
  const hasName = name.trim().length > 0;
  const games = getAllGames();

  const closeDetails = () => {
    if (creating) return;
    setSelectedGame(null);
    setCreatingSelected(false);
    onDismissCreateError?.();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>A cosa giochiamo stasera?</Text>
          <Text style={styles.subtitle}>Scegli un gioco, invita gli amici e giocate con i vostri telefoni.</Text>

          <View style={styles.joinCard}>
            <SectionHeader label="Hai già un codice?" hint="Entra nella stanza dei tuoi amici." />
            <View style={styles.joinRow}>
              <Input
                placeholder="AB12CD"
                accessibilityLabel="Codice stanza di 6 caratteri"
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  if (joinError) onDismissJoinError?.();
                }}
                autoCapitalize="characters"
                maxLength={6}
                style={styles.codeInput}
              />
              <Button
                onPress={() => onJoin(normalized)}
                disabled={!ROOM_CODE_RE.test(normalized) || joining || creating}
                variant="secondary"
                style={{ width: 'auto', flexShrink: 0 }}
              >
                {joining ? 'Ingresso…' : 'Entra'}
              </Button>
            </View>
            {joinError ? <ErrorBanner message={joinError} onDismiss={onDismissJoinError} style={styles.error} /> : null}
          </View>

          <SectionHeader label="Scegli il tuo gioco" hint="Tocca una scheda per scoprire come si gioca." />
          <View style={styles.catalog}>
            {games.map((game) => (
              <View key={game.id} style={[styles.gameCell, width >= 760 && styles.gameCellWide]}>
                <GameCard
                  icon={game.icon ?? '🎲'}
                  name={game.name}
                  description={game.description}
                  minPlayers={game.minPlayers}
                  maxPlayers={game.maxPlayers}
                  style={styles.gameCard}
                  onPress={() => {
                    setSelectedGame(game);
                    setCreatingSelected(false);
                    onDismissCreateError?.();
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Sheet
        visible={selectedGame !== null}
        onClose={closeDetails}
        title={selectedGame?.name}
        footer={selectedGame ? (
          <View style={styles.sheetWidth}>
            <Button
              size="lg"
              disabled={creating || (creatingSelected && !hasName)}
              onPress={() => {
                if (!creatingSelected && !nameLocked) {
                  setCreatingSelected(true);
                  return;
                }
                onCreate(selectedGame.id);
              }}
            >
              {creating ? 'Creazione…' : creatingSelected ? 'Crea e invita gli amici' : 'Crea una stanza'}
            </Button>
          </View>
        ) : undefined}
      >
        {selectedGame ? (
          <View style={styles.sheetWidth}>
            <GameCard
              icon={selectedGame.icon ?? '🎲'}
              name={selectedGame.name}
              description={selectedGame.description}
              minPlayers={selectedGame.minPlayers}
              maxPlayers={selectedGame.maxPlayers}
            />
            <Text style={styles.rulesPreview}>{selectedGame.rules.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}</Text>
            <GameRules key={selectedGame.id} rules={selectedGame.rules} />
            <Text style={styles.helper}>Nella stanza puoi regolare le impostazioni e invitare gli amici con QR o link.</Text>
            {creatingSelected && !nameLocked ? (
              <View style={styles.nameSection}>
                <SectionHeader label="Come ti chiami?" hint="Gli altri giocatori ti vedranno con questo nome." />
                <Input
                  placeholder="es. Mario"
                  accessibilityLabel="Il tuo nome"
                  value={name}
                  onChangeText={onNameChange}
                  maxLength={15}
                  autoFocus
                />
              </View>
            ) : null}
            {createError ? <ErrorBanner message={createError} onDismiss={onDismissCreateError} style={styles.error} /> : null}
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  container: { width: '100%', maxWidth: 1040, alignSelf: 'center' },
  title: { color: colors.textPrimary, fontFamily: fonts.displayHeavy, fontSize: fontSize.xxl, letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.xl },
  joinCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeInput: { flex: 1, minWidth: 0, fontFamily: fonts.code as string, letterSpacing: 3, textAlign: 'center', fontSize: fontSize.md },
  catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gameCell: { width: '100%' },
  gameCellWide: { width: '48.5%', flexGrow: 1, maxWidth: '50%' },
  gameCard: { flex: 1 },
  sheetWidth: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  rulesPreview: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: 24, marginVertical: spacing.lg },
  helper: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.lg },
  nameSection: { marginTop: spacing.xl },
  error: { marginTop: spacing.md },
});
