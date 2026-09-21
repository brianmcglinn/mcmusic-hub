import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { addToQueue } from '../lib/queueClient';
import { colors, fonts } from '../lib/colors';
import type { SearchResult } from '../types';

// Shared "here's a track, add it" row — used by every search/browse
// endpoint that terminates in a flat track list (Song search, an
// artist's album, a playlist, a genre's album).
export function TrackRow({ item, sessionId, addedBy }: { item: SearchResult; sessionId: string; addedBy: string }) {
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    try {
      await addToQueue(sessionId, item, addedBy);
      setAdded(true);
    } catch (err) {
      // Most likely the "already in the queue" exception raised inside
      // add_to_queue_item — a real, expected outcome, not a bug.
      console.error('[TrackRow] add to queue failed:', err);
    }
  }

  return (
    <View style={styles.row}>
      <Image source={{ uri: item.thumbnailUrl ?? undefined }} style={styles.thumb} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {item.artist}
        </Text>
      </View>
      <Pressable style={[styles.addButton, added && styles.addButtonDone]} disabled={added} onPress={handleAdd}>
        <Text style={styles.addButtonText}>{added ? 'Added' : '+ Add'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.panel },
  title: { fontFamily: fonts.bodyMedium, color: colors.chrome, fontSize: 15 },
  artist: { fontFamily: fonts.body, color: colors.steel, fontSize: 13 },
  addButton: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16 },
  addButtonDone: { borderColor: colors.ice },
  addButtonText: { fontFamily: fonts.bodySemiBold, color: colors.chrome, fontSize: 13 },
});
