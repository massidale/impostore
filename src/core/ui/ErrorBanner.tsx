import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorBanner({ message, onDismiss, style }: ErrorBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.bar} />
      <Text style={styles.message}>{message}</Text>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityLabel="Chiudi messaggio di errore"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismiss}
        >
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.danger,
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  dismiss: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dismissIcon: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 22,
    fontFamily: fonts.body,
  },
});
