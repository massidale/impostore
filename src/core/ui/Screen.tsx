import React, { ReactNode } from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface ScreenProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Screen wrapper: applies the top/side safe-area insets but NOT the bottom
 * one. Bottom UI (sticky footers, host actions) anchors to the physical
 * bottom edge with its own small padding — the same reference the bottom
 * Sheet uses (`position: fixed; bottom: 0`), so screens and sheets align.
 */
export function Screen({ style, children }: ScreenProps) {
  if (Platform.OS !== 'web') {
    return <SafeAreaView style={style}>{children}</SafeAreaView>;
  }
  return <View style={[styles.web, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  web: {
    // react-native-web passes CSS strings through (same trick as its own
    // SafeAreaView implementation).
    paddingTop: 'env(safe-area-inset-top)' as unknown as number,
    paddingLeft: 'env(safe-area-inset-left)' as unknown as number,
    paddingRight: 'env(safe-area-inset-right)' as unknown as number,
  },
});
