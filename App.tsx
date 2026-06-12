import React, { useEffect, useState } from 'react';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import MainScreen from './src/screens/MainScreen';
import { SplashScreen } from './src/core/ui/SplashScreen';

const FONT_TIMEOUT_MS = 2500;
/** Branded splash stays up at least this long, even on instant loads. */
const MIN_SPLASH_MS = 1400;

export default function App() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const [timedOut, setTimedOut] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    const minSplash = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_MS);
    return () => {
      clearTimeout(timeout);
      clearTimeout(minSplash);
    };
  }, []);

  const fontsReady = loaded || error != null || timedOut;
  if (!fontsReady || !minSplashElapsed) return <SplashScreen />;
  return <MainScreen />;
}
