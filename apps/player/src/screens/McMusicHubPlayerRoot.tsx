import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Device from 'expo-device';
import { useSessionQueue } from '../hooks/useSessionQueue';
import { NowPlayingScreen } from './NowPlayingScreen';
import { LogoWithWordmark } from '../components/Logo';
import { QRCodeBadge } from '../components/QRCodeBadge';
import { colors, fonts } from '../lib/colors';

const DEVICE_DISPLAY_NAME = Device.deviceName ?? 'McMusic Hub Player';

function ModeSelectScreen({ onSelect }: { onSelect: (mode: 'open' | 'battle') => void }) {
  const [focused, setFocused] = useState<'open' | 'battle' | null>(null);

  return (
    <View style={styles.centeredScreen}>
      <View style={styles.topRow}>
        <LogoWithWordmark markSize={44} textSize={26} />
        <QRCodeBadge size={64} />
      </View>
      <Text style={styles.modeSubtitle}>Choose how tonight's queue works.</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeCard, focused === 'open' && styles.modeCardFocused]}
          onFocus={() => setFocused('open')}
          onBlur={() => setFocused((f) => (f === 'open' ? null : f))}
          onPress={() => onSelect('open')}
        >
          <Text style={styles.modeCardTitle}>Open Mode</Text>
          <Text style={styles.modeCardBody}>Everyone sees the full queue.</Text>
        </Pressable>
        <Pressable
          style={[styles.modeCard, focused === 'battle' && styles.modeCardFocused]}
          onFocus={() => setFocused('battle')}
          onBlur={() => setFocused((f) => (f === 'battle' ? null : f))}
          onPress={() => onSelect('battle')}
        >
          <Text style={styles.modeCardTitle}>Battle Mode</Text>
          <Text style={styles.modeCardBody}>Songs stay hidden until they play.</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WaitingScreen() {
  return (
    <View style={styles.centeredScreen}>
      <View style={styles.topRow}>
        <LogoWithWordmark markSize={40} textSize={22} />
        <QRCodeBadge size={64} />
      </View>
      <View style={styles.waitingDot} />
      <Text style={styles.waitingText}>Waiting for songs to be added&hellip;</Text>
    </View>
  );
}

function PlayerSession({ mode }: { mode: 'open' | 'battle' }) {
  const { sessionId, nowPlaying, advance, hasLoadedOnce } = useSessionQueue(DEVICE_DISPLAY_NAME, mode);
  const isIdle = !hasLoadedOnce || !nowPlaying;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isIdle ? (
        <WaitingScreen />
      ) : (
        <NowPlayingScreen nowPlaying={nowPlaying} advance={advance} sessionId={sessionId} />
      )}
    </View>
  );
}

export function McMusicHubPlayerRoot() {
  const [mode, setMode] = useState<'open' | 'battle' | null>(null);

  return mode ? <PlayerSession mode={mode} /> : <ModeSelectScreen onSelect={setMode} />;
}

const styles = StyleSheet.create({
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 28,
    paddingHorizontal: 40,
  },
  topRow: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeSubtitle: { fontFamily: fonts.body, color: colors.steel, fontSize: 16, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 20 },
  modeCard: {
    width: 240,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    gap: 8,
  },
  modeCardFocused: {
    borderColor: colors.ice,
    backgroundColor: colors.panel,
    shadowColor: colors.ice,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ scale: 1.04 }],
  },
  modeCardTitle: { fontFamily: fonts.display, color: colors.chrome, fontSize: 20, letterSpacing: -0.2 },
  modeCardBody: { fontFamily: fonts.body, color: colors.silver, fontSize: 14, lineHeight: 20 },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ice,
    shadowColor: colors.ice,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  waitingText: { fontFamily: fonts.body, color: colors.silver, fontSize: 18 },
});
