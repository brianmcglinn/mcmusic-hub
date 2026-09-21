import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { LogoWithWordmark } from '../components/Logo';
import { colors, fonts } from '../lib/colors';
import type { Session } from '../types';

export function SessionPickerScreen({ onSelect }: { onSelect: (session: Session) => void }) {
  const { sessions, loading, rescan } = useActiveSessions();

  return (
    <View style={styles.container}>
      <LogoWithWordmark markSize={30} textSize={18} />
      <Text style={styles.title}>Join a Gathering</Text>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>No active sessions right now — make sure a Player is open nearby.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onSelect(item)}>
              <View>
                <Text style={styles.cardTitle}>{item.display_name}</Text>
                <Text style={styles.cardMode}>{item.mode === 'battle' ? 'Battle Mode' : 'Open Mode'}</Text>
              </View>
              <View style={styles.liveDot} />
            </Pressable>
          )}
        />
      )}
      <Pressable style={styles.scanButton} onPress={rescan} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.ice} />
        ) : (
          <Text style={styles.scanButtonText}>Scan for Gatherings</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, gap: 28, backgroundColor: colors.background },
  title: { fontFamily: fonts.display, color: colors.chrome, fontSize: 24, letterSpacing: -0.2 },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.steel },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontFamily: fonts.bodySemiBold, color: colors.chrome, fontSize: 17 },
  cardMode: { fontFamily: fonts.body, color: colors.steel, fontSize: 13, marginTop: 4 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ice,
    shadowColor: colors.ice,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scanButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  scanButtonText: { fontFamily: fonts.bodySemiBold, color: colors.ice, fontSize: 15 },
});
