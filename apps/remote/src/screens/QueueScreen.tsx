import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { useSessionQueue } from '../hooks/useSessionQueue';
import { colors, fonts } from '../lib/colors';
import type { QueueItem } from '../types';

export function QueueScreen({
  sessionId,
  mode,
  myName,
}: {
  sessionId: string;
  mode: 'open' | 'battle';
  myName: string;
}) {
  const items = useSessionQueue(sessionId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Queue</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing queued yet — add a song!</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QueueRow item={item} mode={mode} myName={myName} />}
        />
      )}
    </View>
  );
}

function QueueRow({ item, mode, myName }: { item: QueueItem; mode: 'open' | 'battle'; myName: string }) {
  // Battle Mode conceals everyone else's still-queued songs — only the
  // person who added it, or anything already playing, shows real
  // details. Open Mode never conceals anything. This is display-layer
  // only (see docs/design-doc.md) — not real per-player security.
  const isMine = item.added_by === myName;
  const isPlaying = item.status === 'playing';
  const reveal = mode === 'open' || isMine || isPlaying;

  return (
    <View style={[styles.row, isPlaying && styles.rowPlaying]}>
      {reveal ? (
        <>
          <Image source={{ uri: item.thumbnail_url ?? undefined }} style={styles.thumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            {isPlaying && <Text style={styles.nowPlayingBadge}>NOW PLAYING</Text>}
            <Text numberOfLines={1} style={styles.rowTitle}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={styles.rowArtist}>
              {item.artist}
            </Text>
          </View>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.concealedText}>Added by {item.added_by}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  title: { fontFamily: fonts.display, color: colors.chrome, fontSize: 22, letterSpacing: -0.2, marginBottom: 16 },
  empty: { fontFamily: fonts.body, color: colors.steel, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowPlaying: { backgroundColor: 'rgba(143,227,255,0.06)' },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.panel },
  rowTitle: { fontFamily: fonts.bodyMedium, color: colors.chrome, fontSize: 15 },
  rowArtist: { fontFamily: fonts.body, color: colors.steel, fontSize: 13 },
  nowPlayingBadge: { fontFamily: fonts.bodySemiBold, color: colors.ice, fontSize: 11, letterSpacing: 1, marginBottom: 2 },
  concealedText: { fontFamily: fonts.body, color: colors.steel, fontSize: 15, fontStyle: 'italic' },
});
