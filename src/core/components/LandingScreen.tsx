import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, ErrorBanner, Input, SectionHeader, Sheet, colors, fonts, fontSize, spacing } from '../ui';

interface LandingScreenProps {
  name: string;
  onNameChange: (name: string) => void;
  nameLocked?: boolean;
  onCreate: () => void;
  onJoin: (code: string) => void;
  creating?: boolean;
  joining?: boolean;
  createError?: string | null;
  onDismissCreateError?: () => void;
  joinError?: string | null;
  onDismissJoinError?: () => void;
}
const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

export default function LandingScreen({name, onNameChange, nameLocked, onCreate, onJoin, creating, joining,
  createError, onDismissCreateError, joinError, onDismissJoinError}: LandingScreenProps) {
  const [flow, setFlow] = useState<'create' | 'join' | null>(null);
  const [code, setCode] = useState('');
  const normalized = code.trim().toUpperCase();
  const openCreate = () => {onDismissCreateError?.(); setFlow('create');};
  const openJoin = () => {onDismissJoinError?.(); setFlow('join');};
  return <>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Button size="lg" contentStyle={styles.createButton} textStyle={styles.createLabel} onPress={openCreate} disabled={creating || joining}>
          Crea una stanza
        </Button>
        <Text style={styles.hint}>Invita gli amici con QR o link e scegliete a cosa giocare.</Text>
        <View style={styles.divider}><View style={styles.line}/><Text style={styles.or}>oppure</Text><View style={styles.line}/></View>
        <Button size="lg" variant="secondary" contentStyle={styles.joinButton} textStyle={styles.joinLabel} onPress={openJoin} disabled={creating || joining}>
          Unisciti a una stanza
        </Button>
        <Text style={styles.hint}>Hai già un codice? Entra nella stanza dei tuoi amici.</Text>
        {joinError && !flow && <ErrorBanner message={joinError} onDismiss={onDismissJoinError} />}
      </View>
    </ScrollView>
    <Sheet visible={flow !== null} title={flow === 'create' ? 'Crea una stanza' : 'Unisciti a una stanza'}
      onClose={() => {if (!creating && !joining) setFlow(null);}}
      footer={<View style={styles.container}><Button size="lg"
        disabled={creating || joining || (flow === 'create' ? !name.trim() : !ROOM_CODE_RE.test(normalized))}
        onPress={() => {if (flow === 'create') onCreate(); else if (flow === 'join') onJoin(normalized);}}>
        {flow === 'create' ? creating ? 'Creazione…' : 'Crea e invita gli amici' : joining ? 'Ingresso…' : 'Entra'}
      </Button></View>}>
      <View style={styles.container}>
        {flow === 'create' ? <>
          {!nameLocked && <>
            <SectionHeader label="Come ti chiami?" hint="Gli altri giocatori ti vedranno con questo nome." />
            <Input accessibilityLabel="Il tuo nome" placeholder="es. Mario" value={name} onChangeText={onNameChange} maxLength={15} />
          </>}
          <Text style={styles.sheetHint}>Una volta creata la stanza puoi invitare gli amici e scegliere il gioco.</Text>
          {createError && <ErrorBanner message={createError} onDismiss={onDismissCreateError} />}
        </> : <>
          <SectionHeader label="Codice stanza" hint="Inserisci i 6 caratteri che ti ha dato l’host." />
          <Input accessibilityLabel="Codice stanza di 6 caratteri" placeholder="AB12CD" value={code}
            onChangeText={text => {setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '')); onDismissJoinError?.();}}
            autoCapitalize="characters" maxLength={6} style={styles.codeInput} />
          {joinError && <ErrorBanner message={joinError} onDismiss={onDismissJoinError} />}
        </>}
      </View>
    </Sheet>
  </>;
}
const styles = StyleSheet.create({
  content: {flexGrow: 1, justifyContent: 'center', padding: spacing.xl},
  container: {width: '100%', maxWidth: 560, alignSelf: 'center'},
  createButton: {minHeight: 144},
  createLabel: {fontFamily: fonts.displayHeavy, fontSize: 30},
  joinButton: {minHeight: 112},
  joinLabel: {fontFamily: fonts.displayHeavy, fontSize: 24},
  hint: {color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: 22, textAlign: 'center', marginTop: spacing.md},
  divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl},
  line: {flex: 1, height: 1, backgroundColor: colors.border},
  or: {color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm},
  sheetHint: {color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: 22, marginVertical: spacing.lg},
  codeInput: {fontFamily: fonts.code, letterSpacing: 4, textAlign: 'center', fontSize: fontSize.lg},
});
