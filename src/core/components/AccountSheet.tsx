import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Button,
  ErrorBanner,
  Input,
  NoticeBanner,
  SectionHeader,
  Sheet,
  colors,
  fonts,
  fontSize,
  spacing,
} from '../ui';
import type { AuthUser } from '../hooks/useAuthUser';
import {
  loginWithEmail,
  logout,
  registerWithEmail,
  resendVerificationEmail,
} from '../services/authService';

interface AccountSheetProps {
  visible: boolean;
  onClose: () => void;
  authUser: AuthUser;
}

type Mode = 'login' | 'register';

/**
 * Optional account flow: Google or email+password (with verification
 * email). Anonymous play stays the default — this only adds a stable
 * nickname + cross-device identity for whoever wants it.
 */
export default function AccountSheet({ visible, onClose, authUser }: AccountSheetProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetFeedback = () => {
    setError(null);
    setInfo(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    resetFeedback();
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'register') {
      if (nickname.trim().length < 2) {
        setError('Inserisci un nickname di almeno 2 caratteri.');
        return;
      }
      run(async () => {
        await registerWithEmail(email, password, nickname);
        setInfo(
          `Account creato! Ti abbiamo inviato un'email di conferma a ${email.trim()}.`
        );
        setPassword('');
      });
    } else {
      run(async () => {
        await loginWithEmail(email, password);
        onClose();
      });
    }
  };

  const handleResend = () =>
    run(async () => {
      await resendVerificationEmail();
      setInfo('Email di conferma inviata di nuovo.');
    });

  const handleLogout = () => run(() => logout());

  // ── Signed-in view ──
  if (authUser.isRegistered) {
    return (
      <Sheet visible={visible} onClose={onClose} title="Il tuo account">
        <SectionHeader label="Nickname" />
        <Text style={styles.bigValue}>{authUser.displayName || '—'}</Text>

        <SectionHeader label="Email" style={{ marginTop: spacing.lg }} />
        <Text style={styles.value}>{authUser.email || '—'}</Text>

        {!authUser.emailVerified && authUser.email ? (
          <View style={{ marginTop: spacing.lg }}>
            <NoticeBanner
              badge="Da verificare"
              message="Controlla la tua casella e conferma l'email."
              tone="warning"
            />
            <Button
              onPress={handleResend}
              variant="secondary"
              size="sm"
              disabled={busy}
              style={{ marginTop: spacing.sm }}
            >
              Reinvia email di conferma
            </Button>
          </View>
        ) : null}

        {error ? <ErrorBanner message={error} style={{ marginTop: spacing.lg }} /> : null}
        {info ? (
          <NoticeBanner message={info} tone="primary" style={{ marginTop: spacing.lg }} />
        ) : null}

        <Button
          onPress={handleLogout}
          variant="dangerOutline"
          disabled={busy}
          style={{ marginTop: spacing.xl }}
        >
          Esci dall'account
        </Button>
        <Text style={styles.hint}>
          Uscendo continuerai a giocare come ospite, con un'identità legata a
          questo dispositivo.
        </Text>
      </Sheet>
    );
  }

  // ── Login / register view ──
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={mode === 'login' ? 'Accedi' : 'Crea un account'}
    >
      <Text style={styles.intro}>
        Facoltativo: con un account il tuo nickname ti segue su ogni
        dispositivo. Puoi sempre giocare come ospite.
      </Text>

      {mode === 'register' ? (
        <>
          <SectionHeader label="Nickname" />
          <Input
            placeholder="es. Mario"
            value={nickname}
            onChangeText={setNickname}
            maxLength={15}
            style={{ marginBottom: spacing.md }}
          />
        </>
      ) : null}

      <SectionHeader label="Email" />
      <Input
        placeholder="nome@esempio.it"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <SectionHeader label="Password" />
      <Input
        placeholder={mode === 'register' ? 'Almeno 6 caratteri' : 'La tua password'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      {error ? <ErrorBanner message={error} style={{ marginBottom: spacing.md }} /> : null}
      {info ? (
        <NoticeBanner message={info} tone="primary" style={{ marginBottom: spacing.md }} />
      ) : null}

      <Button
        onPress={handleSubmit}
        variant="primary"
        disabled={busy || !email.trim() || !password}
      >
        {busy ? 'Attendi…' : mode === 'login' ? 'Accedi' : 'Registrati'}
      </Button>

      <Text
        style={styles.switchMode}
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          resetFeedback();
        }}
      >
        {mode === 'login'
          ? 'Non hai un account? Registrati'
          : 'Hai già un account? Accedi'}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
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
  switchMode: {
    color: colors.primaryLight,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bigValue: {
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
  },
  value: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
