import React, { useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Button, Input, ErrorBanner, ProgressCounter, colors, fonts, fontSize, radius, spacing } from '../ui';

interface Props {
  collected: number;
  total: number;
  myWords: string[];
  canSubmit: boolean;
  onSubmit: (word: string) => Promise<unknown>;
}

/** Word entry uses the shared input, buttons and card styling from Indovina. */
export function WordCollectionCard({collected, total, myWords, canSubmit, onSubmit}: Props) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current || !draft.trim()) return;
    pending.current = true; setBusy(true); setError(null);
    try { await onSubmit(draft.trim()); setDraft(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Invio non riuscito'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <ScrollView style={{flex:1}} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.card}>
      <Text style={styles.title}>SCRIVI UNA PAROLA</Text>
      <Text style={styles.hint}>Le vostre parole formeranno il mazzo dei tre round. Puoi inviarne più di una.</Text>
      <ProgressCounter completed={collected} total={total} suffix="carte" />
      {canSubmit ? <>
        <Input value={draft} onChangeText={setDraft} maxLength={60} placeholder="Es. Cleopatra, pizza, Roma…" accessibilityLabel="Parola da aggiungere al mazzo" />
        <Button disabled={busy || !draft.trim()} onPress={submit}>Aggiungi parola</Button>
      </> : <Text style={styles.hint}>Gli altri giocatori stanno preparando il mazzo.</Text>}
      {error && <ErrorBanner message={error} />}
      {myWords.length > 0 && <View style={styles.sent}>
        <Text style={styles.hint}>HAI INVIATO</Text>
        <Text style={styles.words}>{myWords.join(' · ')}</Text>
      </View>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: {flexGrow:1, justifyContent:'center', padding:spacing.sm},
  card: {backgroundColor:colors.surface, borderRadius:radius.lg, padding:spacing.lg, gap:spacing.md},
  title: {color:colors.textPrimary,fontFamily:fonts.displayHeavy,fontSize:fontSize.lg,textAlign:'center',letterSpacing:1.5},
  hint: {color:colors.textSecondary,fontFamily:fonts.body,fontSize:fontSize.sm,textAlign:'center'},
  sent: {backgroundColor:colors.background,borderRadius:radius.md,borderWidth:1,borderColor:colors.success,padding:spacing.md,gap:spacing.sm},
  words: {color:colors.textPrimary,fontFamily:fonts.displayHeavy,fontSize:fontSize.lg,textAlign:'center'},
});
