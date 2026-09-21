import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { QueueItem } from '../types';
import { YoutubeNowPlaying } from '../components/YoutubeNowPlaying';
import { PlexAudioNowPlaying } from '../components/PlexAudioNowPlaying';
import { SpotifyNowPlaying } from '../components/SpotifyNowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { UpNextStrip } from '../components/UpNextStrip';
import { LogoWithWordmark } from '../components/Logo';
import { QRCodeBadge } from '../components/QRCodeBadge';
import { colors } from '../lib/colors';
import { HEADER_HEIGHT, BOTTOM_CHROME_HEIGHT, PLAYER_AREA_HEIGHT } from '../lib/layout';

export function NowPlayingScreen({
  nowPlaying,
  advance,
  sessionId,
}: {
  nowPlaying: QueueItem;
  advance: () => void;
  sessionId: string | null;
}) {
  const [progress, setProgress] = useState({ position: 0, duration: 0 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.playerArea}>
        {nowPlaying.source === 'youtube' ? (
          <YoutubeNowPlaying
            key={nowPlaying.id}
            videoId={nowPlaying.source_id}
            onEnded={advance}
            onError={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        ) : nowPlaying.source === 'spotify' ? (
          <SpotifyNowPlaying
            key={nowPlaying.id}
            item={nowPlaying}
            onEnded={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        ) : (
          <PlexAudioNowPlaying
            key={nowPlaying.id}
            item={nowPlaying}
            onEnded={advance}
            onProgress={(position, duration) => setProgress({ position, duration })}
          />
        )}
      </View>

      <View style={styles.header}>
        <LogoWithWordmark />
        <QRCodeBadge size={64} />
      </View>

      <View style={styles.bottomChrome}>
        <ProgressBar position={progress.position} duration={progress.duration} />
        <UpNextStrip sessionId={sessionId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  playerArea: {
    position: 'absolute',
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    height: PLAYER_AREA_HEIGHT,
  },
  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_CHROME_HEIGHT,
  },
});
