import { buttonFontSize } from './buttonFontSize';
import React, { useLayoutEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

/** Native font fitting plus measured web fitting: button labels never wrap. */
export function ButtonLabel({style, children, ...props}: TextProps) {
  const ref = useRef<any>(null);
  const baseSize = Number(StyleSheet.flatten(style)?.fontSize ?? 16);
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = ref.current as HTMLElement | null;
    if (!element) return;
    const fit = () => {
      element.style.fontSize = `${baseSize}px`;
      const width = element.clientWidth;
      // A single-line Text can clip its scrollWidth at the ellipsis. Measure
      // the actual glyph range too, and reserve two pixels for font rounding.
      const range = document.createRange();
      range.selectNodeContents(element);
      const naturalWidth = Math.max(element.scrollWidth, range.getBoundingClientRect().width);
      if (width > 2 && naturalWidth > width - 2) {
        element.style.fontSize = `${buttonFontSize(baseSize, width - 2, naturalWidth)}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    document.fonts?.ready.then(() => { if (ref.current === element) fit(); });
    return () => observer.disconnect();
  }, [baseSize, children, style]);
  return <Text {...props} ref={ref} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.1}
    style={[style, {minWidth:0, flexShrink:1}, Platform.OS === 'web' && ({whiteSpace:'nowrap', overflowWrap:'normal', wordBreak:'normal'} as any)]}>{children}</Text>;
}
