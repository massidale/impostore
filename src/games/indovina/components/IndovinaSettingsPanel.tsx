import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { SegmentedControl, colors, fonts, radius, spacing, fontSize } from '../../../core/ui';
import { AiDictionaryCard } from '../../../core/components/AiDictionaryCard';
import { generateWordsList } from '../../../core/services/geminiService';
import { setCustomWords, resetToDefaultWords } from '../services/indovinaWordService';
import { resetIndovinaUsedWords } from '../services/indovinaLogic';
import { IndovinaSettings, WordSource } from '../types';

const AI_WORDS_COUNT = 30;

export default function IndovinaSettingsPanel({ settings, onSettingsChange, roomId }: SettingsPanelProps) {
  const s = (settings || {}) as IndovinaSettings;
  const wordSource: WordSource = s.wordSource ?? 'random';

  const setWordSource = (next: WordSource) => {
    if (next === wordSource) return;
    onSettingsChange({ ...s, wordSource: next } satisfies IndovinaSettings);
  };

  const handleGenerate = async (topic: string): Promise<string | null> => {
    const result = await generateWordsList(topic, AI_WORDS_COUNT);
    if (result.usedFallback) {
      resetToDefaultWords();
      if (roomId) await resetIndovinaUsedWords(roomId).catch(() => {});
      return null;
    }
    setCustomWords(result.words);
    if (roomId) await resetIndovinaUsedWords(roomId).catch(() => {});
    return `Generate ${result.words.length} parole sul tema "${topic}"`;
  };

  const handleReset = async () => {
    resetToDefaultWords();
    if (roomId) await resetIndovinaUsedWords(roomId).catch(() => {});
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Origine delle parole</Text>
      <SegmentedControl<WordSource>
        value={wordSource}
        onChange={setWordSource}
        options={[
          { value: 'random', label: 'Casuali', description: 'Da dizionario o AI' },
          { value: 'players', label: 'Scelte dai giocatori', description: 'Ognuno scrive una parola' },
        ]}
        style={{ marginBottom: spacing.md }}
      />

      {wordSource === 'random' && (
        <AiDictionaryCard
          placeholder="Es. Cartoni animati"
          onGenerate={handleGenerate}
          onReset={handleReset}
        />
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

const styles = StyleSheet.create({
  bold: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
