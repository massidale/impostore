import React, { useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button, ErrorBanner, confirmDialog } from '../ui';

interface Props {
  kind: 'game' | 'round' | 'turn';
  onConfirm: () => void | Promise<unknown>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  message?: string;
}

/** Consistent closing controls: nothing is sent until the user confirms. */
export function EndActionButton({kind, onConfirm, disabled, style, label, message}: Props) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = kind === 'game' ? 'partita' : kind === 'round' ? 'round' : 'turno';
  const title = `Terminare ${kind === 'game' ? 'la' : 'il'} ${noun}?`;
  const text = label ?? `Termina ${noun}`;
  const press = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (await confirmDialog({title, message: message ?? (kind === 'game'
        ? 'La partita verrà chiusa per tutti i giocatori.'
        : `Il ${noun} in corso verrà chiuso.`), confirmLabel: text, destructive: kind === 'game'})) {
        await onConfirm();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Azione non riuscita. Riprova.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return <>
    <Button onPress={press} disabled={disabled || busy} style={style}
      variant={kind === 'game' ? 'dangerMuted' : 'warningMuted'}>{text}</Button>
    {error && <ErrorBanner message={error} />}
  </>;
}
