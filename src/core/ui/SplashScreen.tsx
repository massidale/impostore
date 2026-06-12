import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts, fontSize, spacing } from './theme';
import { Logo } from './Logo';

/**
 * Branded launch screen: symbol + wordmark fading in on the dark
 * background. Shown at startup for a minimum beat (see App.tsx) while
 * fonts and auth warm up.
 */
export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}
      >
        <Logo size="xl" variant="symbol" />
        <View style={styles.wordmark}>
          <Logo size="lg" variant="wordmark" />
        </View>
        <Text style={styles.tagline}>Party game con gli amici</Text>
      </Animated.View>
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
  center: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: spacing.xl,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
});
