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

export default function App() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = loaded || error != null;
  if (!ready && !timedOut) return <SplashScreen />;
  return <MainScreen />;
}
