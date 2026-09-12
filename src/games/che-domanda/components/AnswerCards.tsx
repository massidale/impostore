import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AvatarPlayer } from '../../../core/ui/AvatarPlayer';
import { ButtonLabel } from '../../../core/ui/ButtonLabel';
import { wrappingText } from '../../../core/ui/wrappingText';
import { colors, fonts, radius, spacing } from '../../../core/ui/theme';

interface Props {
  answers: Record<string, number | string>;
  players: Record<string, { name?: string }>;
  roles?: Record<string, string>;
  eliminatedUids?: string[];
  textAnswer?: boolean;
}

export function RoleBadge({ role }: { role: string }) {
  const impostor = role === 'impostore';
  return <View style={[styles.badge, { borderColor: impostor ? colors.roleImpostor : colors.roleCivilian }]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.role, { color: impostor ? colors.roleImpostor : colors.roleCivilian }]}>
      {impostor ? 'Impostore' : 'Civile'}
    </Text>
  </View>;
}

function formatValue(value: number | string): string {
  if (typeof value === 'number') return String(value).replace('.', ',');
  return value;
}

/** Renders only answers and roles already revealed by the game view. */
export function AnswerCards({ answers, players, roles = {}, eliminatedUids = [], textAnswer = false }: Props) {
  const entries = Object.entries(answers);
  if (!entries.length) return null;

  if (textAnswer) {
    // Layout inline per risposte testuali: ogni riga = avatar (con nome) + risposta
    return <View style={styles.inlineList}>
      {entries.map(([uid, value]) => (
        <View key={uid} style={styles.inlineRow}>
          <View style={styles.inlineAvatar}>
            <AvatarPlayer uid={uid} name={players[uid]?.name || 'Giocatore'} size="sm" eliminated={eliminatedUids.includes(uid)} />
          </View>
          <View style={styles.inlineContent}>
            <Text style={styles.inlineAnswer}>{formatValue(value)}</Text>
          </View>
          {roles[uid] && <RoleBadge role={roles[uid]} />}
        </View>
      ))}
    </View>;
  }

  // Layout griglia per risposte numeriche (struttura simile all'originale)
  return <View style={styles.grid}>
    {entries.map(([uid, value]) => (
      <View key={uid} style={styles.tile}>
        {/* Contenitore avatar con altezza fissa: il badge eliminato non sposta il numero */}
        <View style={styles.avatarBox}>
          <AvatarPlayer uid={uid} name={players[uid]?.name || 'Giocatore'} size="md" eliminated={eliminatedUids.includes(uid)} />
        </View>
        {/* Box delimitatrice con numero; altezza fissa per allineare */}
        <View style={styles.numberBox}>
          <ButtonLabel style={styles.number}>{formatValue(value)}</ButtonLabel>
          {roles[uid] && <View style={styles.roleRow}><RoleBadge role={roles[uid]} /></View>}
        </View>
      </View>
    ))}
  </View>;
}

export function AlternativeQuestionCard({ question }: { question?: string }) {
  if (!question) return null;
  return <View style={styles.questionCard}>
    <Text style={styles.caption}>Domanda alternativa</Text>
    <Text style={styles.question}>{question}</Text>
  </View>;
}

const styles = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Tile adattiva: 2 per riga su mobile, 3+ su schermi larghi.
  // flex: 1 con minWidth fa sì che le box si allarghino a riempire la riga.
  tile: { flex: 1, minWidth: 140, alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: radius.md, padding: spacing.sm },
  // Altezza fissa per l'avatar: tutti gli avatar si allineano in basso
  // così i nomi sovrapposti sono sullo stesso asse verticale.
  avatarBox: { height: 90, alignItems: 'center', justifyContent: 'flex-end' },
  numberBox: { width: '100%', minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  number: { textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.displayHeavy, fontSize: 32 },
  roleRow: { alignItems: 'center' },
  badge: { maxWidth: '100%', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  role: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  // Inline (text answers)
  inlineList: { width: '100%', gap: spacing.sm },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMuted, borderRadius: radius.md, padding: spacing.sm },
  inlineAvatar: { alignItems: 'center', justifyContent: 'center' },
  inlineContent: { flex: 1, minWidth: 0, gap: 2 },
  inlineAnswer: { color: colors.textPrimary, fontFamily: fonts.bodySemi, fontSize: 16, ...wrappingText },
  // Alternative question
  questionCard: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  caption: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center' },
  question: { color: colors.textPrimary, fontFamily: fonts.bodySemi, fontSize: 18, textAlign: 'center', ...wrappingText },
});
