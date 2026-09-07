import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ParticipantTile } from '../../../core/components/ParticipantTile';
import { ButtonLabel } from '../../../core/ui/ButtonLabel';
import { wrappingText } from '../../../core/ui/wrappingText';
import { colors, fonts, radius, spacing } from '../../../core/ui/theme';

interface Props {
  answers: Record<string, number>;
  players: Record<string, { name?: string }>;
  roles?: Record<string, string>;
  eliminatedUids?: string[];
}

export function RoleBadge({ role }: { role: string }) {
  const impostor = role === 'impostore';
  return <View style={[styles.badge, { borderColor: impostor ? colors.roleImpostor : colors.roleCivilian }]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.role, { color: impostor ? colors.roleImpostor : colors.roleCivilian }]}>
      {impostor ? 'Impostore' : 'Civile'}
    </Text>
  </View>;
}

/** Renders only answers and roles already revealed by the game view. */
export function AnswerCards({ answers, players, roles = {}, eliminatedUids = [] }: Props) {
  if (!Object.keys(answers).length) return null;
  return <View style={styles.grid}>
    {Object.entries(answers).map(([uid, value]) => <ParticipantTile key={uid} uid={uid} name={players[uid]?.name || 'Giocatore'} wide>
      <ButtonLabel style={styles.number}>{String(value).replace('.', ',')}</ButtonLabel>
      {roles[uid] && <RoleBadge role={roles[uid]} />}
      {eliminatedUids.includes(uid) && <Text style={styles.eliminated}>Eliminato</Text>}
    </ParticipantTile>)}
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
  grid: { width: '100%', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  number: { width: '100%', textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.displayHeavy, fontSize: 32, marginVertical: spacing.xs },
  badge: { maxWidth: '100%', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  role: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  eliminated: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  questionCard: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  caption: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center' },
  question: { color: colors.textPrimary, fontFamily: fonts.bodySemi, fontSize: 18, textAlign: 'center', ...wrappingText },
});
