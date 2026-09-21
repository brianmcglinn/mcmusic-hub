import { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import TrackPlayer from '@rntp/player';
import { colors } from '../src/lib/colors';

// No kiosk mode / BackExitHandler here, unlike McJukebox Player — this
// app runs on shared Google TVs that need to stay normal, exitable apps
// between gatherings, not permanently screen-pinned.

// Keep the native splash screen up until fonts are actually ready —
// without this, a brief flash of the system default font is visible
// before Space Grotesk/IBM Plex Sans finish loading.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  useEffect(() => {
    (async () => {
      try {
        // Wrapped in try/await rather than .then()/.catch() — on some
        // devices setupPlayer's first call doesn't reliably return a
        // real Promise (a known timing quirk in this library).
        await TrackPlayer.setupPlayer({
          contentType: 'music',
          handleAudioBecomingNoisy: true,
          android: { wakeMode: 'network' },
        });
      } catch {
        // no-op — setupPlayer also throws if called twice (e.g. fast refresh)
      }
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
