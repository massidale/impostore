import React, { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { fitContent, Size } from './fitGeometry';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  /** Optional natural card width before scaling, to avoid very narrow wrapping. */
  minContentWidth?: number;
  testID?: string;
}

/** Wrap at the available width first, then scale the complete card to fit its
 * measured height. The measuring box is unconstrained vertically, so resizing
 * and font/content changes never measure an already scaled card. */
export function FitContent({ children, style, maxWidth = 560, minContentWidth = 0, testID = 'fit-content' }: Props) {
  const [viewport, setViewport] = useState<Size>({width: 0, height: 0});
  const [content, setContent] = useState<Size>({width: 0, height: 0});
  const measure = (setter: React.Dispatch<React.SetStateAction<Size>>) => (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setter(previous => previous.width === width && previous.height === height ? previous : {width, height});
  };
  const width = Math.min(Math.max(viewport.width, minContentWidth), maxWidth);
  const fitted = fitContent(viewport, content);
  return (
    <View testID={testID} style={[styles.viewport, style]} onLayout={measure(setViewport)}>
      {viewport.width > 0 && (
        <View
          testID={`${testID}-body`}
          onLayout={measure(setContent)}
          style={{
            position: 'absolute', width, left: fitted.left, top: fitted.top,
            opacity: fitted.scale > 0 ? 1 : 0,
            transform: [{scale: fitted.scale || 1}],
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  viewport: {flex: 1, minHeight: 0, minWidth: 0, alignSelf: 'stretch'},
});
