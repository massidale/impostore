import { Platform, TextStyle } from 'react-native';

/** Break long unspaced words on web too, without clipping or ellipses. */
export const wrappingText: TextStyle = {
  minWidth: 0,
  flexShrink: 1,
  ...Platform.select({web: {overflowWrap: 'anywhere', whiteSpace: 'normal'} as TextStyle}),
};
