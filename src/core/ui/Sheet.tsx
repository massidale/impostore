import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';

// Lazy-load react-dom only on web. On native, this require is never reached.
let createPortal: ((node: React.ReactNode, container: Element) => React.ReactElement) | null = null;
if (Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    createPortal = require('react-dom').createPortal;
  } catch {
    createPortal = null;
  }
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Sticky bottom action area — stays visible while content scrolls. */
  footer?: ReactNode;
  /** Max content height as a fraction of the screen (default 0.9). */
  maxHeightRatio?: number;
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeightRatio = 0.9,
}: SheetProps) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const opacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetInner = (
    <>
      <View style={styles.handle} />
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Chiudi"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  // On web: render through a portal attached to document.body. The backdrop and
  // the sheet are siblings — both `position: fixed` against the visual viewport,
  // so the sheet is anchored directly to `bottom: 0` without depending on a
  // chain of flex parents (which previously left a gap below the sheet because
  // the wrapping KeyboardAvoidingView had `height: auto`). Using `100dvh` keeps
  // it pinned correctly across mobile-browser URL-bar transitions.
  if (Platform.OS === 'web') {
    if (!visible) return null;
    if (createPortal && typeof document !== 'undefined') {
      return createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100dvh',
            zIndex: 1000,
          }}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0, 0, 0, 0.6)', opacity },
            ]}
          >
            <TouchableWithoutFeedback onPress={onClose}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              styles.sheetWeb,
              {
                maxHeight: (`${maxHeightRatio * 100}dvh` as unknown) as number,
                transform: [{ translateY }],
              },
            ]}
          >
            {sheetInner}
          </Animated.View>
        </div>,
        document.body
      );
    }
  }

  const nativeContent = (
    <Animated.View style={[styles.backdrop, { opacity }]}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              maxHeight: `${maxHeightRatio * 100}%` as `${number}%`,
            },
          ]}
        >
          {sheetInner}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {nativeContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  kbWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primaryTint,
  },
  sheetWeb: {
    position: 'fixed' as 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 28,
    fontFamily: fonts.body,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
