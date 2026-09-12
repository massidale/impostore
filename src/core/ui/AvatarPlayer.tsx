import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, spacing } from './theme';
import { avatarColor, avatarInitial } from './avatarColor';

export type AvatarPlayerSize = 'sm' | 'md' | 'lg';

interface AvatarPlayerProps {
  uid: string;
  name: string;
  /** Mostra il contorno verde (es. "ha risposto"). */
  ready?: boolean;
  /** Mostra il badge "Eliminato". */
  eliminated?: boolean;
  size?: AvatarPlayerSize;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<AvatarPlayerSize, { circle: number; font: number; ringGap: number; nameMax: number }> = {
  sm: { circle: 36, font: 16, ringGap: 3, nameMax: 80 },
  md: { circle: 44, font: 18, ringGap: 4, nameMax: 90 },
  lg: { circle: 56, font: 22, ringGap: 5, nameMax: 100 },
};

/**
 * Avatar cerchiato con iniziale (presto foto profilo) e nome sovrapposto
 * in basso. Il contorno verde (quando `ready`) è staccato dal cerchio da
 * un gap proporzionale alla dimensione. Il nome è bianco e grassetto su
 * sfondo sfumato semi-trasparente, allineato al cerchio, con ellissi se
 * troppo lungo.
 * Riutilizzabile in griglie di stato e in visualizzazioni risposte.
 */
export function AvatarPlayer({
  uid,
  name,
  ready = false,
  eliminated = false,
  size = 'md',
  children,
  style,
}: AvatarPlayerProps) {
  const sz = SIZES[size];
  const outerSize = sz.circle + sz.ringGap * 2;
  return (
    <View style={[styles.cell, { width: outerSize }, style]} accessibilityLabel={`${name}${ready ? ' · pronto' : ''}`}>
      <View
        style={[
          styles.avatarOuter,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
        ]}
      >
        {/* Ring verde staccato (absolute, non influisce sul layout) */}
        {ready && (
          <View
            style={[
              styles.ring,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: outerSize / 2,
                borderWidth: 2,
                borderColor: colors.success,
              },
            ]}
          />
        )}
        {/* Foto profilo / iniziale — grigio opaco se eliminato */}
        <View
          style={[
            styles.avatar,
            {
              width: sz.circle,
              height: sz.circle,
              borderRadius: sz.circle / 2,
              backgroundColor: eliminated
                ? 'rgba(128,128,128,0.85)'
                : avatarColor(uid),
              opacity: eliminated ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: sz.font }]}>
            {avatarInitial(name)}
          </Text>
        </View>
      </View>
      {/* Nome centrato sotto l'avatar, sovrapposto di ~15% */}
      <View style={[styles.nameWrap, { width: outerSize, marginTop: -sz.circle * 0.15 }]} pointerEvents="none">
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
      </View>
      {/* Badge eliminato sotto il nome */}
      {eliminated && <Text style={styles.eliminated} pointerEvents="none">Eliminato</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    minWidth: 0,
  },
  avatarOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.background,
    fontFamily: fonts.displayHeavy,
  },
  nameWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    textAlign: 'center',
  },
  eliminated: {
    color: 'rgba(128,128,128,0.85)',
    fontFamily: fonts.body,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});