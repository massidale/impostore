import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from './theme';
import { Logo } from './Logo';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Logo size="xl" variant="lockup" />
      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  spinner: {
    marginTop: spacing.xxxl,
    opacity: 0.7,
  },
});
