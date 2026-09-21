import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import {
  searchPlexAll,
  listPlexArtists,
  listPlexAlbumsForArtist,
  listPlexTracksForAlbum,
  listPlexGenres,
  listPlexAlbumsForGenre,
  listPlexPlaylists,
  listPlexTracksForPlaylist,
} from '../lib/plexClient';
import { TrackRow } from './TrackRow';
import { BrowseRow } from './BrowseRow';
import { BackHeader } from './BackHeader';
import { colors, fonts } from '../lib/colors';
import type { SearchResult, PlexArtist, PlexAlbum, PlexFilterValue, PlexPlaylist } from '../types';

type View =
  | { kind: 'search' }
  | { kind: 'browseRoot' }
  | { kind: 'artists' }
  | { kind: 'artistAlbums'; artist: PlexArtist }
  | { kind: 'genres' }
  | { kind: 'genreAlbums'; genre: PlexFilterValue }
  | { kind: 'playlists' }
  | { kind: 'albumTracks'; album: PlexAlbum; back: View }
  | { kind: 'playlistTracks'; playlist: PlexPlaylist };

export function PlexBrowser({ sessionId, addedBy }: { sessionId: string; addedBy: string }) {
  const [top, setTop] = useState<'search' | 'browse'>('search');
  const [view, setView] = useState<View>({ kind: 'search' });
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SearchResult[]>([]);
  const [artists, setArtists] = useState<PlexArtist[]>([]);

  const [browseArtists, setBrowseArtists] = useState<PlexArtist[]>([]);
  const [albums, setAlbums] = useState<PlexAlbum[]>([]);
  const [genres, setGenres] = useState<PlexFilterValue[]>([]);
  const [playlists, setPlaylists] = useState<PlexPlaylist[]>([]);
  const [albumTracks, setAlbumTracks] = useState<SearchResult[]>([]);

  function switchTop(next: 'search' | 'browse') {
    setTop(next);
    setView(next === 'search' ? { kind: 'search' } : { kind: 'browseRoot' });
    setQuery('');
    setTracks([]);
    setArtists([]);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { tracks: t, artists: a } = await searchPlexAll(query.trim());
      setTracks(t);
      setArtists(a);
    } catch (err) {
      console.error('[Plex] search failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openArtists() {
    setLoading(true);
    try {
      setBrowseArtists(await listPlexArtists());
      setView({ kind: 'artists' });
    } catch (err) {
      console.error('[Plex] listPlexArtists failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openArtistAlbums(artist: PlexArtist) {
    setLoading(true);
    try {
      setAlbums(await listPlexAlbumsForArtist(artist.ratingKey));
      setView({ kind: 'artistAlbums', artist });
    } catch (err) {
      console.error('[Plex] listPlexAlbumsForArtist failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openGenres() {
    setLoading(true);
    try {
      setGenres(await listPlexGenres());
      setView({ kind: 'genres' });
    } catch (err) {
      console.error('[Plex] listPlexGenres failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openGenreAlbums(genre: PlexFilterValue) {
    setLoading(true);
    try {
      setAlbums(await listPlexAlbumsForGenre(genre));
      setView({ kind: 'genreAlbums', genre });
    } catch (err) {
      console.error('[Plex] listPlexAlbumsForGenre failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openPlaylists() {
    setLoading(true);
    try {
      setPlaylists(await listPlexPlaylists());
      setView({ kind: 'playlists' });
    } catch (err) {
      console.error('[Plex] listPlexPlaylists failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openAlbumTracks(album: PlexAlbum, back: View) {
    setLoading(true);
    try {
      setAlbumTracks(await listPlexTracksForAlbum(album.ratingKey));
      setView({ kind: 'albumTracks', album, back });
    } catch (err) {
      console.error('[Plex] listPlexTracksForAlbum failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openPlaylistTracks(playlist: PlexPlaylist) {
    setLoading(true);
    try {
      setAlbumTracks(await listPlexTracksForPlaylist(playlist.ratingKey));
      setView({ kind: 'playlistTracks', playlist });
    } catch (err) {
      console.error('[Plex] listPlexTracksForPlaylist failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topTabs}>
        <Pressable style={[styles.topTab, top === 'search' && styles.topTabActive]} onPress={() => switchTop('search')}>
          <Text style={[styles.topTabText, top === 'search' && styles.topTabTextActive]}>Search</Text>
        </Pressable>
        <Pressable style={[styles.topTab, top === 'browse' && styles.topTabActive]} onPress={() => switchTop('browse')}>
          <Text style={[styles.topTabText, top === 'browse' && styles.topTabTextActive]}>Browse</Text>
        </Pressable>
      </View>

      {view.kind === 'search' && (
        <>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a song or artist..."
            placeholderTextColor={colors.steel}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={[...artists.map((a) => ({ type: 'artist' as const, item: a })), ...tracks.map((t) => ({ type: 'track' as const, item: t }))]}
            keyExtractor={(row) => (row.type === 'artist' ? `a-${row.item.ratingKey}` : `t-${row.item.sourceId}`)}
            renderItem={({ item: row }) =>
              row.type === 'artist' ? (
                <BrowseRow title={row.item.name} thumbnailUrl={row.item.thumbnailUrl} onPress={() => openArtistAlbums(row.item)} />
              ) : (
                <TrackRow item={row.item} sessionId={sessionId} addedBy={addedBy} />
              )
            }
          />
        </>
      )}

      {view.kind === 'browseRoot' && (
        <View style={{ gap: 12 }}>
          <Pressable style={styles.browseCategoryBtn} onPress={openArtists}>
            <Text style={styles.browseCategoryText}>Artists</Text>
          </Pressable>
          <Pressable style={styles.browseCategoryBtn} onPress={openGenres}>
            <Text style={styles.browseCategoryText}>Genres</Text>
          </Pressable>
          <Pressable style={styles.browseCategoryBtn} onPress={openPlaylists}>
            <Text style={styles.browseCategoryText}>Playlists</Text>
          </Pressable>
        </View>
      )}

      {view.kind === 'artists' && (
        <>
          <BackHeader title="Artists" onBack={() => setView({ kind: 'browseRoot' })} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={browseArtists}
            keyExtractor={(item) => item.ratingKey}
            renderItem={({ item }) => (
              <BrowseRow title={item.name} thumbnailUrl={item.thumbnailUrl} onPress={() => openArtistAlbums(item)} />
            )}
          />
        </>
      )}

      {view.kind === 'artistAlbums' && (
        <>
          <BackHeader title={view.artist.name} onBack={() => setView({ kind: 'artists' })} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={albums}
            keyExtractor={(item) => item.ratingKey}
            renderItem={({ item }) => (
              <BrowseRow
                title={item.title}
                subtitle={item.year ? String(item.year) : null}
                thumbnailUrl={item.thumbnailUrl}
                onPress={() => openAlbumTracks(item, view)}
              />
            )}
          />
        </>
      )}

      {view.kind === 'genres' && (
        <>
          <BackHeader title="Genres" onBack={() => setView({ kind: 'browseRoot' })} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={genres}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => <BrowseRow title={item.title} onPress={() => openGenreAlbums(item)} />}
          />
        </>
      )}

      {view.kind === 'genreAlbums' && (
        <>
          <BackHeader title={view.genre.title} onBack={() => setView({ kind: 'genres' })} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={albums}
            keyExtractor={(item) => item.ratingKey}
            renderItem={({ item }) => (
              <BrowseRow
                title={item.title}
                subtitle={item.artistName ?? (item.year ? String(item.year) : null)}
                thumbnailUrl={item.thumbnailUrl}
                onPress={() => openAlbumTracks(item, view)}
              />
            )}
          />
        </>
      )}

      {view.kind === 'playlists' && (
        <>
          <BackHeader title="Playlists" onBack={() => setView({ kind: 'browseRoot' })} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.ratingKey}
            renderItem={({ item }) => (
              <BrowseRow
                title={item.title}
                subtitle={`${item.trackCount} songs`}
                thumbnailUrl={item.thumbnailUrl}
                onPress={() => openPlaylistTracks(item)}
              />
            )}
          />
        </>
      )}

      {view.kind === 'albumTracks' && (
        <>
          <BackHeader title={view.album.title} onBack={() => setView(view.back)} />
          {loading && <ActivityIndicator color={colors.ice} style={{ marginTop: 20 }} />}
          <FlatList
            data={albumTracks}
            keyExtractor={(item) => item.sourceId}
            renderItem={({ item }) => <TrackRow item={item} sessionId={sessionId} addedBy={addedBy} />}
          />
        </>
      )}

      {view.kind === 'playlistTracks' && (
        <>
          <BackHeader title={view.playlist.title} onBack={() => setView({ kind: 'playlists' })} />
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
  topTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  topTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  topTabActive: { backgroundColor: colors.panel, borderColor: colors.ice },
  topTabText: { fontFamily: fonts.bodyMedium, color: colors.steel, fontSize: 13 },
  topTabTextActive: { color: colors.ice },
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
  browseCategoryBtn: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  browseCategoryText: { fontFamily: fonts.bodySemiBold, color: colors.chrome, fontSize: 16 },
});
