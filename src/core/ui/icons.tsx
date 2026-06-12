import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from './theme';

/**
 * Shared SVG icon set. Game-specific icons (role masks, etc.) live in the
 * game's own components; only icons reused across games belong here.
 */

export interface IconProps {
  size?: number;
  color?: string;
}

export const EyeOffIcon = ({ size = 18, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1={1} y1={1} x2={23} y2={23} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const WarningIcon = ({ size = 20, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L1.5 21h21L12 3z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.18}
    />
    <Line x1={12} y1={10} x2={12} y2={15} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Circle cx={12} cy={18} r={1.1} fill={color} />
  </Svg>
);

export const CheckIcon = ({ size = 48, color = colors.success }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TrophyIcon = ({ size = 28, color = colors.warning }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill={color} fillOpacity={0.18} />
    <Path d="M7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M10 14h4v2h-4zM9 21h6M12 16v5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ClockIcon = ({ size = 20, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
    <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const BellIcon = ({ size = 20, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.15}
    />
    <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const UserIcon = ({ size = 20, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
    <Path
      d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const XIcon = ({ size = 18, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const UndoIcon = ({ size = 18, color = colors.textPrimary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 14L4 9l5-5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4 9h10a6 6 0 0 1 0 12h-3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ForbiddenIcon = ({ size = 20, color = colors.danger }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2.2} />
    <Line x1={5.8} y1={5.8} x2={18.2} y2={18.2} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);
