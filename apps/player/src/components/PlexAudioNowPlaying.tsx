import { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import TrackPlayer, { usePlaybackState, useIsPlaying, useProgress, PlaybackState } from '@rntp/player';
import { getPlexStreamUrl } from '../lib/plexClient';
import { colors, fonts } from '../lib/colors';
import { SCREEN, PLAYER_AREA_HEIGHT } from '../lib/layout';
import { NeonGlow } from './NeonGlow';
import { NeonTint } from './NeonTint';
import type { QueueItem } from '../types';

const ART_SIZE = Math.min(Math.min(SCREEN.width, PLAYER_AREA_HEIGHT) * 0.5, 500);
const BACKDROP_SIZE = Math.max(SCREEN.width, PLAYER_AREA_HEIGHT) * 1.08;

export function PlexAudioNowPlaying({
  item,
  onEnded,
  onProgress,
}: {
  item: QueueItem;
  onEnded: () => void;
  onProgress?: (position: number, duration: number) => void;
}) {
  const loadedIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);
  const playbackState = usePlaybackState();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress(0.5);

  useEffect(() => {
    if (loadedIdRef.current === item.id) return;
    loadedIdRef.current = item.id;
    hasStartedRef.current = false;

    (async () => {
      try {
        const url = await getPlexStreamUrl(item.source_id);

        const track: { url: string; title: string; artist?: string; artwork?: string } = {
          url,
          title: item.title,
        };
        if (item.artist) track.artist = item.artist;
        if (item.thumbnail_url) track.artwork = item.thumbnail_url;

        await TrackPlayer.setMediaItems([track]);
        await TrackPlayer.play();
        hasStartedRef.current = true;
      } catch (err) {
        console.error('Plex playback failed for', item.title, err);
        onEnded();
      }
    })();

    return () => {
      (async () => {
        try {
          await TrackPlayer.pause();
        } catch {
          // no-op
        }
      })();
    };
  }, [item.id]);

  useEffect(() => {
    console.log(`[Plex] ${item.title} playbackState ->`, playbackState);
    if (!hasStartedRef.current) return;
    if (playbackState === PlaybackState.Ended || playbackState === PlaybackState.Error) {
      onEnded();
    }
  }, [playbackState]);

  useEffect(() => {
    onProgress?.(position, duration);
  }, [position, duration]);

  return (
    <Pressable style={styles.container} onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}>
      {item.thumbnail_url && (
        <Image
          source={{ uri: item.thumbnail_url }}
          blurRadius={30}
          style={{
            position: 'absolute',
            width: BACKDROP_SIZE,
            height: BACKDROP_SIZE,
            left: (SCREEN.width - BACKDROP_SIZE) / 2,
            top: (PLAYER_AREA_HEIGHT - BACKDROP_SIZE) / 2,
          }}
        />
      )}
      <View style={styles.scrim} />
      <NeonTint opacity={0.1} />

      <View style={styles.artworkSection}>
        <View style={{ width: ART_SIZE, height: ART_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <NeonGlow size={ART_SIZE} />
          <Image
            source={{ uri: item.thumbnail_url ?? undefined }}
            style={[styles.art, { width: ART_SIZE, height: ART_SIZE }]}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.textSection}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
        <View style={styles.addedByPill}>
          <View style={styles.addedByDot} />
          <Text style={styles.addedByText}>Added by {item.added_by}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  artworkSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textSection: { alignItems: 'center', paddingBottom: 24 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,8,10,0.72)' },
  art: { borderRadius: 16, backgroundColor: colors.card },
  title: {
    fontFamily: fonts.display,
    color: colors.chrome,
    fontSize: 24,
    marginTop: 22,
    paddingHorizontal: 24,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  artist: { fontFamily: fonts.body, color: colors.silver, fontSize: 16, marginTop: 4 },
  addedByPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addedByDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.steel },
  addedByText: { fontFamily: fonts.body, fontSize: 13, color: colors.silver },
});
