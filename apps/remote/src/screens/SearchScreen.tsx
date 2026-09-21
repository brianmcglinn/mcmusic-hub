import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { searchYouTubeMusic } from '../lib/youtubeClient';
import { PlexBrowser } from '../components/PlexBrowser';
import { SpotifyBrowser } from '../components/SpotifyBrowser';
import { TrackRow } from '../components/TrackRow';
import { colors, fonts } from '../lib/colors';
import type { SearchResult, ItemSource } from '../types';

const SOURCES: { key: ItemSource; label: string }[] = [
  { key: 'plex', label: 'My Library' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'spotify', label: 'Spotify' },
];

// Plex and Spotify both now hand off to their own full Search+Browse (or
// Song/Artist) components. YouTube stays a simple search block by
// design — no browse structure requested for it.
export function SearchScreen({ sessionId, addedBy }: { sessionId: string; addedBy: string }) {
  const [source, setSource] = useState<ItemSource>('plex');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      setResults(await searchYouTubeMusic(query.trim()));
    } catch (err) {
      console.error('[Search] YouTube search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {SOURCES.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.tab, source === s.key && styles.tabActive]}
            onPress={() => {
              setSource(s.key);
              setResults([]);
              setQuery('');
            }}
          >
            <Text style={[styles.tabText, source === s.key && styles.tabTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {source === 'plex' ? (
        <PlexBrowser sessionId={sessionId} addedBy={addedBy} />
      ) : source === 'spotify' ? (
        <SpotifyBrowser sessionId={sessionId} addedBy={addedBy} />
      ) : (
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
            data={results}
            keyExtractor={(item) => item.sourceId}
            renderItem={({ item }) => <TrackRow item={item} sessionId={sessionId} addedBy={addedBy} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tabActive: { backgroundColor: colors.panel, borderColor: colors.ice },
  tabText: { fontFamily: fonts.bodyMedium, color: colors.steel, fontSize: 13 },
  tabTextActive: { color: colors.ice },
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
});
