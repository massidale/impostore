import { useCallback, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

/** Uses the game area after app header, safe area and host controls. */
export function useGameViewport() {
  const [size, setSize] = useState({width: 0, height: 0});
  const onLayout = useCallback(({nativeEvent: {layout}}: LayoutChangeEvent) => {
    setSize(previous => previous.width === layout.width && previous.height === layout.height
      ? previous : {width: layout.width, height: layout.height});
  }, []);
  return {onLayout, compact: size.height > 0 && size.height < 560, ...size};
}
