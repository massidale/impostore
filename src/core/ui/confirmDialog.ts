import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Cross-platform confirmation dialog. Returns true if the user confirmed.
 *
 * On web: uses `window.confirm` (message-only). On native: uses
 * `Alert.alert` with proper button styles.
 */
export function confirmDialog({
  title = 'Conferma',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Annulla',
  destructive,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { onDismiss: () => resolve(false) }
    );
  });
}
