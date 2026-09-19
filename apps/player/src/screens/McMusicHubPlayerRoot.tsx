import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSessionQueue } from '../hooks/useSessionQueue';
import { NowPlayingScreen } from './NowPlayingScreen';

// McMusic Hub v2 — the Player root, replacing McJukebox's JukeboxRoot.
// Deliberately much smaller: no IdleAttractScreen (tap-to-add is gone —
// Remote owns all song selection), no JukeboxSearchScreen, no
// AdminGateButton, no kiosk mode / BackExitHandler (Player is a normal,
// exitable app on shared Google TVs, not a locked single-purpose device).
// What's left is close to the essence of the original: show now-playing,
// or a passive waiting state.

// Placeholder — replace with a real per-device name (or a way to set
// one) once that's designed; this just unblocks everything else.
const DEVICE_DISPLAY_NAME = 'McMusic Hub Player';

function ModeSelectScreen({ onSelect }: { onSelect: (mode: 'open' | 'battle') => void }) {
  // Rough first pass, no visual design applied yet — a real styling pass
  // (matching the neon aesthetic elsewhere in this project) comes later,
  // once the underlying flow itself is confirmed working.
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700' }}>McMusic Hub</Text>
      <Pressable onPress={() => onSelect('open')}>
        <Text style={{ fontSize: 24 }}>Open Mode</Text>
      </Pressable>
      <Pressable onPress={() => onSelect('battle')}>
        <Text style={{ fontSize: 24 }}>Battle Mode</Text>
      </Pressable>
    </View>
  );
}

function WaitingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28 }}>Waiting for the first song…</Text>
    </View>
  );
}

function PlayerSession({ mode }: { mode: 'open' | 'battle' }) {
  const { nowPlaying, advance, hasLoadedOnce } = useSessionQueue(DEVICE_DISPLAY_NAME, mode);
  const isIdle = !hasLoadedOnce || !nowPlaying;

  return (
    <View style={{ flex: 1 }}>
      {isIdle ? <WaitingScreen /> : <NowPlayingScreen nowPlaying={nowPlaying} advance={advance} />}
    </View>
  );
}

export function McMusicHubPlayerRoot() {
  // Mode is chosen once, at launch, before a session is even registered —
  // register_session requires it. No settings screen exists for changing
  // it mid-session; restarting Player is how you'd pick a different mode
  // for the next gathering.
  const [mode, setMode] = useState<'open' | 'battle' | null>(null);

  return mode ? <PlayerSession mode={mode} /> : <ModeSelectScreen onSelect={setMode} />;
}
