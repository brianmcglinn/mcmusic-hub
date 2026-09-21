import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { searchSpotifyTracks, searchSpotifyArtists, listSpotifyAlbumsForArtist, listSpotifyTracksForAlbum } from '../lib/spotifyClient';
import { TrackRow } from './TrackRow';
import { BrowseRow } from './BrowseRow';
import { BackHeader } from './BackHeader';
import { colors, fonts } from '../lib/colors';
import type { SearchResult, SpotifyArtist, SpotifyAlbum } from '../types';

type View =
  | { kind: 'song' }
  | { kind: 'artist' }
  | { kind: 'artistAlbums'; artist: SpotifyArtist }
  | { kind: 'albumTracks'; album: SpotifyAlbum; artist: SpotifyArtist };

const PAGE_SIZE = 10;

export function SpotifyBrowser({ sessionId, addedBy }: { sessionId: string; addedBy: string }) {
  const [mode, setMode] = useState<'song' | 'artist'>('song');
  const [view, setView] = useState<View>({ kind: 'song' });
  const [query, setQuery] = useState('');
  const [trackResults, setTrackResults] = useState<SearchResult[]>([]);
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [albumTotal, setAlbumTotal] = useState(0);
  const [albumTracks, setAlbumTracks] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  function switchMode(next: 'song' | 'artist') {
    setMode(next);
    setView({ kind: next });
    setQuery('');
    setTrackResults([]);
    setArtistResults([]);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (mode === 'song') {
        setTrackResults(await searchSpotifyTracks(query.trim()));
      } else {
        setArtistResults(await searchSpotifyArtists(query.trim()));
      }
    } catch (err) {
      console.error('[Spotify] search failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openArtist(artist: SpotifyArtist) {
    setLoading(true);
    try {
      const { albums: firstPage, total } = await listSpotifyAlbumsForArtist(artist.id, 0);
      setAlbums(firstPage);
      setAlbumTotal(total);
      setView({ kind: 'artistAlbums', artist });
    } catch (err) {
      console.error('[Spotify] listSpotifyAlbumsForArtist failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreAlbums(artist: SpotifyArtist) {
    setLoading(true);
    try {
      const { albums: nextPage } = await listSpotifyAlbumsForArtist(artist.id, albums.length, albumTotal);
      setAlbums((prev) => [...prev, ...nextPage]);
    } catch (err) {
      console.error('[Spotify] loadMoreAlbums failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openAlbum(album: SpotifyAlbum, artist: SpotifyArtist) {
    setLoading(true);
    try {
      setAlbumTracks(await listSpotifyTracksForAlbum(album.id, album.thumbnailUrl));
      setView({ kind: 'albumTracks', album, artist });
    } catch (err) {
      console.error('[Spotify] listSpotifyTracksForAlbum failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {(view.kind === 'song' || view.kind === 'artist') && (
        <>
          <View style={styles.modeTabs}>
            <Pressable style={[styles.modeTab, mode === 'song' && styles.modeTabActive]} onPress={() => switchMode('song')}>
              <Text style={[styles.modeTabText, mode === 'song' && styles.modeTabTextActive]}>Song</Text>
            </Pressable>
            <Pressable style={[styles.modeTab, mode === 'artist' && styles.modeTabActive]} onPress={() => switchMode('artist')}>
              <Text style={[styles.modeTabText, mode === 'artist' && styles.modeTabTextActive]}>Artist</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'song' ? 'Search for a song...' : 'Search for an artist...'}
            placeholderTextColor={colors.steel}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          {mode === 'song' ? (
            <FlatList
              data={trackResults}
              keyExtractor={(item) => item.sourceId}
              renderItem={({ item }) => <TrackRow item={item} sessionId={sessionId} addedBy={addedBy} />}
            />
          ) : (
            <FlatList
              data={artistResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <BrowseRow title={item.name} thumbnailUrl={item.thumbnailUrl} onPress={() => openArtist(item)} />
              )}
            />
          )}
        </>
      )}

      {view.kind === 'artistAlbums' && (
        <>
          <BackHeader title={view.artist.name} onBack={() => setView({ kind: 'artist' })} />
          {loading && albums.length === 0 && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BrowseRow
                title={item.title}
                subtitle={item.year ? String(item.year) : null}
                thumbnailUrl={item.thumbnailUrl}
                onPress={() => openAlbum(item, view.artist)}
              />
            )}
            ListFooterComponent={
              albums.length < albumTotal ? (
                <Pressable style={styles.loadMoreBtn} onPress={() => loadMoreAlbums(view.artist)} disabled={loading}>
                  <Text style={styles.loadMoreText}>{loading ? 'Loading...' : 'Load more'}</Text>
                </Pressable>
              ) : null
            }
          />
        </>
      )}

      {view.kind === 'albumTracks' && (
        <>
          <BackHeader
            title={view.album.title}
            onBack={() => setView({ kind: 'artistAlbums', artist: view.artist })}
          />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={albumTracks}
            keyExtractor={(item) => item.sourceId}
            renderItem={({ item }) => <TrackRow item={item} sessionId={sessionId} addedBy={addedBy} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  modeTabActive: { backgroundColor: colors.panel, borderColor: colors.ice },
  modeTabText: { fontFamily: fonts.bodyMedium, color: colors.steel, fontSize: 13 },
  modeTabTextActive: { color: colors.ice },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.chrome,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontFamily: fonts.bodySemiBold, color: colors.ice, fontSize: 14 },
});
