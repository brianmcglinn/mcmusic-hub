import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from '@rntp/player';

// No kiosk mode / BackExitHandler here, unlike McJukebox Player — this
// app runs on shared Google TVs that need to stay normal, exitable apps
// between gatherings, not permanently screen-pinned.

export default function RootLayout() {
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

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
