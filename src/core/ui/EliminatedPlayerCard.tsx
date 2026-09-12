import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface EliminatedPlayerCardProps {
  /** Nome del giocatore eliminato. */
  name: string;
  /** Ruolo rivelato: 'impostore' | 'civile' | stringa personalizzata. */
  role: string;
  /** Etichetta del badge ruolo (es. 'Impostore', 'Civile'). Se omessa usa role. */
  roleLabel?: string;
  /** Colore del ruolo per il badge. Se omesso usa i colori di default. */
  roleColor?: string;
  /** Titolo della box (default: "Giocatore espulso"). */
  title?: string;
  /** Messaggio aggiuntivo sotto il badge (es. "L'impostore sta tentando..."). */
  message?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Box condivisa per l'eliminazione di un giocatore, riutilizzabile
 * in tutti i giochi a eliminazione. Mostra nome + ruolo in evidenza,
 * con eventuale messaggio aggiuntivo.
 */
export function EliminatedPlayerCard({
  name,
  role,
  roleLabel,
  roleColor,
  title = 'Giocatore espulso',
  message,
  style,
}: EliminatedPlayerCardProps) {
  const impostor = role === 'impostore';
  const color = roleColor ?? (impostor ? colors.roleImpostor : colors.roleCivilian);
  const label = roleLabel ?? (impostor ? 'Impostore' : 'Civile');

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  title: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: 28,
    textAlign: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  message: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});