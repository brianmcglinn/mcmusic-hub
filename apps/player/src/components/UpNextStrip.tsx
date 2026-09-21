import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { useUpNextQueue } from '../hooks/useUpNextQueue';
import { colors, fonts } from '../lib/colors';
import type { QueueItem } from '../types';

export function UpNextStrip({ sessionId }: { sessionId: string | null }) {
  const { items, totalQueued } = useUpNextQueue(sessionId, 6);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>UP NEXT</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Queue's empty — add songs from McMusic Hub Remote!</Text>
        </View>
      </View>
    );
  }

  const remainder = totalQueued - items.length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>UP NEXT</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item, index }) => <UpNextCard item={item} isNext={index === 0} />}
        ListFooterComponent={
          remainder > 0 ? (
            <View style={styles.moreChip}>
              <Text style={styles.moreChipText}>+{remainder} more</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function UpNextCard({ item, isNext }: { item: QueueItem; isNext: boolean }) {
  return (
    <View style={[styles.card, isNext && styles.cardHighlight]}>
      <Image source={{ uri: item.thumbnail_url ?? undefined }} style={styles.thumb} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        {isNext && <Text style={styles.nextBadge}>NEXT</Text>}
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {item.artist}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 130,
    backgroundColor: colors.void,
    paddingTop: 10,
    paddingBottom: 16,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    color: colors.steel,
    fontSize: 12,
    letterSpacing: 3,
    marginLeft: 20,
    marginBottom: 10,
  },
  emptyState: { marginHorizontal: 20, height: 76, justifyContent: 'center' },
  emptyText: { fontFamily: fonts.bodyMedium, color: colors.ice, fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 220,
    height: 76,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 12,
    padding: 10,
  },
  cardHighlight: { borderColor: colors.ice },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.panel },
  nextBadge: { fontFamily: fonts.bodySemiBold, color: colors.ice, fontSize: 11, letterSpacing: 1 },
  title: { fontFamily: fonts.bodyMedium, color: colors.chrome, fontSize: 14 },
  artist: { fontFamily: fonts.body, color: colors.steel, fontSize: 12 },
  moreChip: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 76,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  moreChipText: { fontFamily: fonts.bodyMedium, color: colors.steel, fontSize: 13 },
});
