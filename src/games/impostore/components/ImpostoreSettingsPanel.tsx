import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Platform, Alert } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import { Button, Input, NumberSelector, colors, radius, spacing, fontSize } from '../../../core/ui';
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
        style={{ marginTop: spacing.lg }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Abilita indizi</Text>
        <Switch value={s.hintEnabled} onValueChange={(v) => update({ hintEnabled: v })} />
      </View>

      {s.hintEnabled && (
        <View style={styles.nestedContainer}>
          <View style={styles.nestedRow}>
            <Text style={styles.nestedLabel}>Indizio solo al primo giocatore</Text>
            <Switch value={s.hintOnlyFirst} onValueChange={(v) => update({ hintOnlyFirst: v })} />
          </View>
        </View>
      )}

      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiTitle}>Tema Personalizzato</Text>
          <Text style={styles.aiOptional}>opzionale</Text>
        </View>
        <Text style={styles.aiHint}>Genera un dizionario su misura con l'AI</Text>

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
            variant="accentOutline"
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fontSize.md },
  nestedContainer: {
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  nestedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  nestedLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  aiCard: {
    marginTop: spacing.xxl,
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
    color: colors.success,
    marginBottom: spacing.sm + 2,
  },
});
