import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Platform, Alert } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { Button, Input, NumberSelector, colors, spacing, fontSize } from '../../../core/ui';
import { generateWordsForTopic } from '../services/geminiService';
import { setCustomWords, resetToDefaultWords } from '../services/wordService';

export interface ImpostoreSettings {
  numImpostors: number;
  numClowns: number;
  hintEnabled: boolean;
  hintOnlyFirst: boolean;
}

export default function ImpostoreSettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const s = settings as ImpostoreSettings;

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

  const update = (partial: Partial<ImpostoreSettings>) => {
    onSettingsChange({ ...s, ...partial });
  };

  const handleGenerateWords = async () => {
    if (!customTopic.trim()) {
      showAlert('Errore', 'Inserisci un argomento per generare le parole');
      return;
    }
    setGeneratingWords(true);
    const topicToGenerate = customTopic.trim();
    try {
      const result = await generateWordsForTopic(topicToGenerate);
      setCustomWords(result.words);
      setUsingCustomWords(true);
      if (result.usedFallback) {
        showAlert('Attenzione', `Non è stato possibile generare parole personalizzate per "${topicToGenerate}". Usando parole di default.`);
      } else {
        setSavedTopic(topicToGenerate);
        showAlert('Successo', `Generate 20 parole sul tema "${topicToGenerate}"`);
      }
    } catch (e: any) {
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
      <NumberSelector
        label="Numero di Impostori"
        value={s.numImpostors}
        onChange={(v) => update({ numImpostors: v })}
        min={1}
      />

      <NumberSelector
        label="Numero di Pagliacci"
        value={s.numClowns}
        onChange={(v) => update({ numClowns: v })}
        min={0}
        style={{ marginTop: spacing.xl }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Abilita indizi</Text>
        <Switch value={s.hintEnabled} onValueChange={(v) => update({ hintEnabled: v })} />
      </View>

      {s.hintEnabled && (
        <View style={[styles.switchRow, { marginTop: spacing.sm + 2 }]}>
          <Text style={styles.switchLabel}>Indizio solo al primo giocatore</Text>
          <Switch value={s.hintOnlyFirst} onValueChange={(v) => update({ hintOnlyFirst: v })} />
        </View>
      )}

      <View style={styles.aiSection}>
        <Text style={styles.label}>Tema Personalizzato (AI)</Text>
        <Input
          placeholder="Es. Film di Fantascienza"
          value={customTopic}
          onChangeText={setCustomTopic}
          style={{ marginBottom: spacing.sm + 2 }}
        />

        {usingCustomWords ? (
          <View>
            <Text style={styles.activeTopicText}>✅ Tema attivo: {savedTopic}</Text>
            <Button onPress={handleResetWords} variant="danger" size="sm">
              Ripristina Default
            </Button>
          </View>
        ) : (
          <Button
            onPress={handleGenerateWords}
            disabled={generatingWords}
            variant="accent"
            size="sm"
          >
            {generatingWords ? 'Generazione...' : 'Genera Parole con AI'}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    marginBottom: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fontSize.md },
  aiSection: {
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeTopicText: {
    color: colors.success,
    marginBottom: spacing.sm + 2,
  },
});
