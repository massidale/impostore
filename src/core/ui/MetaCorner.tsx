import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { spacing } from './theme';
import { MetadataBadge } from './MetadataBadge';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface MetaCornerProps {
  position: Position;
  label: string;
  value: string;
}

const positionStyle: Record<Position, ViewStyle> = {
  'top-left': { top: spacing.lg, left: spacing.lg },
  'top-right': { top: spacing.lg, right: spacing.lg },
  'bottom-left': { bottom: spacing.lg, left: spacing.lg },
  'bottom-right': { bottom: spacing.lg, right: spacing.lg },
};

/**
 * Absolute-positioned metadata badge pinned to a screen corner —
 * room code, player count, ready counter… Render inside a relative
 * container (the gamepad root view).
 */
export function MetaCorner({ position, label, value }: MetaCornerProps) {
  const isRight = position === 'top-right' || position === 'bottom-right';
  return (
    <MetadataBadge
      label={label}
      value={value}
      align={isRight ? 'right' : 'left'}
      style={[styles.base, positionStyle[position]]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    zIndex: 1,
  },
});
