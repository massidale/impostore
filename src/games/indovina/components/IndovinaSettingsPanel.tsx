import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { Button, Input, colors, radius, spacing, fontSize } from '../../../core/ui';
import { generateWordsList } from '../../../core/services/geminiService';
import { setCustomWords, resetToDefaultWords } from '../services/indovinaWordService';
import { IndovinaSettings, WordSource } from '../types';

const AI_WORDS_COUNT = 30;

export default function IndovinaSettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const s = (settings || {}) as IndovinaSettings;
  const wordSource: WordSource = s.wordSource ?? 'random';

  const [customTopic, setCustomTopic] = useState('');
  const [generatingWords, setGeneratingWords] = useState(false);
  const [usingCustomWords, setUsingCustomWords] = useState(false);
  const [savedTopic, setSavedTopic] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const setWordSource = (next: WordSource) => {
    if (next === wordSource) return;
    onSettingsChange({ ...s, wordSource: next } satisfies IndovinaSettings);
  };

  const handleGenerateWords = async () => {
    if (!customTopic.trim()) {
      showAlert('Errore', 'Inserisci un argomento per generare le parole');
      return;
    }
    setGeneratingWords(true);
    const topicToGenerate = customTopic.trim();
    try {
      const result = await generateWordsList(topicToGenerate, AI_WORDS_COUNT);
      if (result.usedFallback) {
        resetToDefaultWords();
        setUsingCustomWords(false);
        setSavedTopic('');
        showAlert(
          'Attenzione',
          `Non è stato possibile generare parole personalizzate per "${topicToGenerate}". Usando parole di default.`
        );
      } else {
        setCustomWords(result.words);
        setUsingCustomWords(true);
        setSavedTopic(topicToGenerate);
        showAlert(
          'Successo',
          `Generate ${result.words.length} parole sul tema "${topicToGenerate}"`
        );
      }
    } catch (e) {
      showAlert('Errore', 'Impossibile generare le parole');
      console.error(e);
    } finally {
      setGeneratingWords(false);
    }
  };

  const handleResetWords = () => {
    resetToDefaultWords();
    setUsingCustomWords(false);
    setCustomTopic('');
    setSavedTopic('');
    showAlert('Successo', 'Parole ripristinate al dizionario predefinito');
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Origine delle parole</Text>
      <View style={styles.segmented}>
        <SegmentedOption
          label="Casuali"
          description="Da dizionario o AI"
          active={wordSource === 'random'}
          onPress={() => setWordSource('random')}
        />
        <SegmentedOption
          label="Scelte dai giocatori"
          description="Ognuno scrive una parola"
          active={wordSource === 'players'}
          onPress={() => setWordSource('players')}
        />
      </View>

      {wordSource === 'random' && (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>Tema Personalizzato</Text>
            <Text style={styles.aiOptional}>opzionale</Text>
          </View>
          <Text style={styles.aiHint}>Genera un dizionario su misura con l'AI</Text>

          <Input
            placeholder="Es. Cartoni animati"
            value={customTopic}
            onChangeText={setCustomTopic}
            style={{ marginBottom: spacing.sm + 2 }}
          />

          {usingCustomWords ? (
            <View>
              <Text style={styles.activeTopicText}>Tema attivo: {savedTopic}</Text>
              <Button onPress={handleResetWords} variant="accentOutline" size="sm">
                Ripristina Default
              </Button>
            </View>
          ) : (
            <Button
              onPress={handleGenerateWords}
              disabled={generatingWords}
              variant="accentOutline"
              size="sm"
            >
              {generatingWords ? 'Generazione...' : 'Genera'}
            </Button>
          )}
        </View>
      )}

      {wordSource === 'players' && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Quando avvii la partita, ogni giocatore inserirà una parola. Verranno
            poi distribuite a caso, garantendo che <Text style={styles.bold}>nessuno riceva la propria</Text>.
          </Text>
        </View>
      )}
    </View>
  );
}

interface SegmentedOptionProps {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}

function SegmentedOption({ label, description, active, onPress }: SegmentedOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.segmentDescription, active && styles.segmentDescriptionActive]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bold: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  segmentLabelActive: {
    color: colors.textPrimary,
  },
  segmentDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  segmentDescriptionActive: {
    color: colors.textSecondary,
  },
  aiCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  aiTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  aiOptional: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  activeTopicText: {
    color: colors.textSecondary,
    marginBottom: spacing.sm + 2,
  },
  infoCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
