import React, { ReactNode, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from './theme';
import { avatarColor, avatarInitial } from './avatarColor';

interface PlayerSlotProps {
  name: string;
  uid: string;
  isHost?: boolean;
  isMe?: boolean;
  /** Tap the row (e.g. for voting). Not shown if undefined. */
  onPress?: () => void;
  disabled?: boolean;
  /** Right-side content (e.g. tag, count, remove button). */
  right?: ReactNode;
  /** Convenience: show a remove "×" button on the right. Ignored if `right` is set. */
  onRemove?: () => void;
  /** Visual emphasis (selected for voting, eliminated, etc.). */
  variant?: 'default' | 'selected' | 'dimmed';
}

export function PlayerSlot({
  name,
  uid,
  isHost,
  isMe,
  onPress,
  disabled,
  right,
  onRemove,
  variant = 'default',
}: PlayerSlotProps) {
  const bg = avatarColor(uid);
  const initial = avatarInitial(name);

  const rightContent = right
    ? right
    : onRemove
    ? (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          accessibilityLabel={`Rimuovi ${name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeIcon}>×</Text>
        </TouchableOpacity>
      )
    : null;

  const body = (
    <View
      style={[
        styles.row,
        variant === 'selected' && styles.rowSelected,
        variant === 'dimmed' && styles.rowDimmed,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name || 'Senza nome'}
          {isMe ? <Text style={styles.me}>  · tu</Text> : null}
        </Text>
        <Text style={styles.role}>{isHost ? 'Host' : 'Giocatore'}</Text>
      </View>
      {rightContent}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}

interface PlayerSlotEmptyProps {
  label?: string;
  index?: number;
}

export function PlayerSlotEmpty({ label = 'In attesa', index = 0 }: PlayerSlotEmptyProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          delay: index * 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, index]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={[styles.avatar, styles.avatarEmpty]} />
      <View style={styles.body}>
        <Text style={styles.namePlaceholder}>{label}…</Text>
        <Text style={styles.role}>Slot libero</Text>
      </View>
    </Animated.View>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
    borderRadius: radius.md,
  },
  rowSelected: {
    backgroundColor: colors.primaryTint,
  },
  rowDimmed: {
    opacity: 0.4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  avatarText: {
    color: colors.background,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.md,
  },
  body: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.md,
  },
  me: {
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
  },
  namePlaceholder: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
  },
  role: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  removeIcon: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 22,
  },
});
