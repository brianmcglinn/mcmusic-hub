import { Pressable, Image, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/colors';

// Generic tappable row used throughout every browse drill-down (Plex
// artists/genres/playlists/albums, Spotify artists/albums) — one shared
// look for "here's a thing, tap it to go deeper."
export function BrowseRow({
  title,
  subtitle,
  thumbnailUrl,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Image source={{ uri: thumbnailUrl ?? undefined }} style={styles.thumb} />
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.panel },
  title: { flex: 1, fontFamily: fonts.bodyMedium, color: colors.chrome, fontSize: 15 },
  subtitle: { fontFamily: fonts.body, color: colors.steel, fontSize: 13 },
});
