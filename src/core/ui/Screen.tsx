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

/** Keeps the app inside the current browser viewport, including safe areas. */
export function Screen({ style, children }: ScreenProps) {
  if (Platform.OS !== 'web') {
    return <SafeAreaView style={style}>{children}</SafeAreaView>;
  }
  return <View style={[styles.web, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  web: {
    minHeight: 0,
    height: '100dvh' as unknown as number,
    maxHeight: '100dvh' as unknown as number,
    paddingBottom: 'env(safe-area-inset-bottom)' as unknown as number,
    // react-native-web passes CSS strings through (same trick as its own
    // SafeAreaView implementation).
    paddingTop: 'env(safe-area-inset-top)' as unknown as number,
    paddingLeft: 'env(safe-area-inset-left)' as unknown as number,
    paddingRight: 'env(safe-area-inset-right)' as unknown as number,
  },
});
