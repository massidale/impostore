import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Button,
  ErrorBanner,
  Input,
  SectionHeader,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../ui';

interface LandingScreenProps {
  /** Player name shared by both flows (create room / join room). */
  name: string;
  onNameChange: (name: string) => void;
  /** Registered accounts bring their own nickname — the input is hidden. */
  nameLocked?: boolean;
  onCreate: () => void;
  /** Called with the normalized 6-char room code. */
  onJoin: (code: string) => void;
  creating?: boolean;
  joining?: boolean;
  joinError?: string | null;
  onDismissJoinError?: () => void;
}

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

/**
 * App entry point: pick your name once, then create a room (the game is
 * chosen later, from the lobby) or join an existing one by code.
 */
export default function LandingScreen({
  name,
  onNameChange,
  nameLocked,
  onCreate,
  onJoin,
  creating,
  joining,
  joinError,
  onDismissJoinError,
}: LandingScreenProps) {
  const [code, setCode] = useState('');
  const normalized = code.trim().toUpperCase();
  const hasName = name.trim().length > 0;
  const canCreate = hasName && !creating;
  const canJoin = hasName && ROOM_CODE_RE.test(normalized) && !joining;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Pronti a giocare?</Text>
      <Text style={styles.subtitle}>
        Una stanza, i telefoni in mano e un gioco da tavolo senza tavolo.
      </Text>

      {!nameLocked ? (
        <View style={styles.card}>
          <SectionHeader
            label="Il tuo nome"
            hint="Lo userai per creare una stanza o per unirti."
          />
          <Input
            placeholder="es. Mario"
            value={name}
            onChangeText={onNameChange}
            maxLength={15}
          />
        </View>
      ) : null}

      <View style={[styles.card, !nameLocked && { marginTop: spacing.lg }]}>
        <SectionHeader
          label="Crea una stanza"
          hint="Invita gli amici con QR o link. Il gioco lo scegli dopo."
        />
        <Button onPress={onCreate} disabled={!canCreate} variant="primary" size="lg">
          {creating ? 'Creazione…' : 'Crea una stanza'}
        </Button>
        {!hasName && !nameLocked ? (
          <Text style={styles.helper}>Inserisci il tuo nome per continuare</Text>
        ) : null}
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>oppure</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.card}>
        <SectionHeader
          label="Unisciti a una stanza"
          hint="Inserisci il codice di 6 caratteri che ti ha dato l'host."
        />
        <Input
          placeholder="es. AB12CD"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            if (joinError) onDismissJoinError?.();
          }}
          maxLength={6}
          style={[styles.codeInput, code.length === 0 && styles.codeInputEmpty]}
        />
        {joinError ? (
          <ErrorBanner
            message={joinError}
            onDismiss={onDismissJoinError}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
        <Button
          onPress={() => onJoin(normalized)}
          disabled={!canJoin}
          variant="secondary"
          style={{ marginTop: spacing.md }}
        >
          {joining ? 'Ingresso…' : 'Unisciti'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xxl,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  codeInput: {
    fontFamily: fonts.code as string,
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: fontSize.lg,
  },
  // The wide-tracked code font looks broken on the placeholder sentence —
  // fall back to the body font until the user starts typing.
  codeInputEmpty: {
    fontFamily: fonts.body,
    letterSpacing: 0,
  },
});
