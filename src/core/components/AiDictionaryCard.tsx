import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { Button, Input, colors, fonts, fontSize, radius, spacing } from '../ui';

export function showSimpleAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

interface AiDictionaryCardProps {
  /** Placeholder for the topic input (e.g. "Es. Film di Fantascienza"). */
  placeholder: string;
  /**
   * Generates content for the topic. Returns the success message, or null
   * when the generator fell back to defaults (a warning alert is shown).
   */
  onGenerate: (topic: string) => Promise<string | null>;
  /** Restores the default dictionary. */
  onReset: () => Promise<void>;
}

/**
 * "Tema personalizzato" card shared by every game's settings panel:
 * topic input + AI generation with the active-topic / reset state.
 */
export function AiDictionaryCard({ placeholder, onGenerate, onReset }: AiDictionaryCardProps) {
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      showSimpleAlert('Errore', 'Inserisci un argomento per generare le parole');
      return;
    }
    setGenerating(true);
    try {
      const successMessage = await onGenerate(trimmed);
      if (successMessage === null) {
        setActiveTopic(null);
        showSimpleAlert(
          'Attenzione',
          `Non è stato possibile generare contenuti per "${trimmed}". Uso il dizionario di default.`
        );
      } else {
        setActiveTopic(trimmed);
        showSimpleAlert('Successo', successMessage);
      }
    } catch (e) {
      showSimpleAlert('Errore', 'Impossibile generare le parole');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    await onReset();
    setActiveTopic(null);
    setTopic('');
    showSimpleAlert('Successo', 'Parole ripristinate al dizionario predefinito');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Tema Personalizzato</Text>
        <Text style={styles.optional}>opzionale</Text>
      </View>
      <Text style={styles.hint}>Genera un dizionario su misura con l'AI</Text>

      <Input
        placeholder={placeholder}
        value={topic}
        onChangeText={setTopic}
        style={{ marginBottom: spacing.sm + 2 }}
      />

      {activeTopic ? (
        <View>
          <Text style={styles.activeTopic}>Tema attivo: {activeTopic}</Text>
          <Button onPress={handleReset} variant="accentOutline" size="sm">
            Ripristina Default
          </Button>
        </View>
      ) : (
        <Button onPress={handleGenerate} disabled={generating} variant="accentOutline" size="sm">
          {generating ? 'Generazione...' : 'Genera'}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.displaySemi,
    fontSize: fontSize.md,
  },
  optional: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  activeTopic: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginBottom: spacing.sm + 2,
  },
});
