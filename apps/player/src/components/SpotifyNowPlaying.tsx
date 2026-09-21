import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import * as SpotifyRemote from '../../modules/spotify-remote';
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '../lib/spotifyClient';
import { colors, fonts } from '../lib/colors';
import { SCREEN, PLAYER_AREA_HEIGHT } from '../lib/layout';
import { NeonGlow } from './NeonGlow';
import { NeonTint } from './NeonTint';
import type { QueueItem } from '../types';

const END_THRESHOLD_MS = 1500;

const TEXT_SECTION_HEIGHT_ESTIMATE = 140;
const ARTWORK_SECTION_HEIGHT = PLAYER_AREA_HEIGHT - TEXT_SECTION_HEIGHT_ESTIMATE;
const ART_SIZE = Math.max(Math.min(Math.min(SCREEN.width, ARTWORK_SECTION_HEIGHT) * 0.85, 500), 80);
const BACKDROP_SIZE = Math.max(SCREEN.width, PLAYER_AREA_HEIGHT) * 1.08;

export function SpotifyNowPlaying({
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
  const hasEndedRef = useRef(false);
  const hasConfirmedCorrectTrackRef = useRef(false);
  const expectedUriRef = useRef<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const lastKnownPositionMsRef = useRef(0);
  const lastKnownDurationMsRef = useRef(0);
  const lastEventTimeRef = useRef(Date.now());
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (loadedIdRef.current === item.id) return;
    loadedIdRef.current = item.id;
    hasStartedRef.current = false;
    hasEndedRef.current = false;
    hasConfirmedCorrectTrackRef.current = false;
    expectedUriRef.current = item.source_id;
    console.log(`[Spotify] Starting "${item.title}" (${item.source_id})`);

    (async () => {
      try {
        if (!SpotifyRemote.isConnected()) {
          try {
            await SpotifyRemote.connect(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
          } catch (quietConnectErr) {
            console.log('[Spotify] Quiet connect() failed, falling back to BAL workaround:', quietConnectErr);
            try {
              await Linking.openURL('spotify:');
              await new Promise((resolve) => setTimeout(resolve, 1500));
            } catch (linkErr) {
              console.error('[Spotify] Could not open Spotify app for BAL workaround:', linkErr);
            }
            await SpotifyRemote.connect(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
          }
        }
        await SpotifyRemote.play(item.source_id);
        hasStartedRef.current = true;

        setTimeout(async () => {
          try {
            const state = await SpotifyRemote.getPlayerState();
            console.log(`[Spotify] getPlayerState() poll for "${item.title}":`, JSON.stringify(state));
          } catch (pollErr) {
            console.error(`[Spotify] getPlayerState() poll FAILED for "${item.title}":`, pollErr);
          }
        }, 2000);
      } catch (err) {
        console.error(`[Spotify] connect()/play() FAILED for "${item.title}":`, err);
        onEnded();
      }
    })();

    return () => {
      SpotifyRemote.pause().catch(() => {});
    };
  }, [item.id]);

  useEffect(() => {
    const stateSub = SpotifyRemote.addPlayerStateListener((state) => {
      if (!hasStartedRef.current || hasEndedRef.current) return;

      const isExpectedTrack = expectedUriRef.current != null && state.trackUri === expectedUriRef.current;
      if (isExpectedTrack && !hasConfirmedCorrectTrackRef.current) {
        console.log(`[Spotify] "${item.title}" confirmed playing`);
      }
      if (isExpectedTrack) {
        hasConfirmedCorrectTrackRef.current = true;
      }

      if (state.durationMs != null) {
        lastKnownPositionMsRef.current = state.playbackPositionMs;
        lastKnownDurationMsRef.current = state.durationMs;
        lastEventTimeRef.current = Date.now();
        onProgress?.(state.playbackPositionMs / 1000, state.durationMs / 1000);
      }
      isPausedRef.current = state.isPaused;
      setIsPaused(state.isPaused);

      if (!hasConfirmedCorrectTrackRef.current) return;

      const trackChangedAway = !isExpectedTrack;
      const reachedEnd =
        isExpectedTrack &&
        state.durationMs != null &&
        state.durationMs > 0 &&
        state.playbackPositionMs >= state.durationMs - END_THRESHOLD_MS &&
        state.isPaused;

      if (trackChangedAway || reachedEnd) {
        console.log(`[Spotify] "${item.title}" ended`);
        hasEndedRef.current = true;
        SpotifyRemote.pause().catch(() => {});
        onEnded();
      }
    });

    const errSub = SpotifyRemote.addErrorListener((err) => {
      console.error(`[Spotify] error event for "${item.title}":`, err.message);
    });

    return () => {
      stateSub.remove();
      errSub.remove();
    };
  }, [item.id]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (isPausedRef.current || lastKnownDurationMsRef.current <= 0) return;
      const elapsed = Date.now() - lastEventTimeRef.current;
      const interpolatedMs = Math.min(
        lastKnownPositionMsRef.current + elapsed,
        lastKnownDurationMsRef.current
      );
      onProgress?.(interpolatedMs / 1000, lastKnownDurationMsRef.current / 1000);
    }, 250);
    return () => clearInterval(tick);
  }, []);

  function togglePlayPause() {
    if (isPaused) {
      SpotifyRemote.resume().catch(() => {});
    } else {
      SpotifyRemote.pause().catch(() => {});
    }
  }

  return (
    <Pressable style={styles.container} onPress={togglePlayPause}>
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
