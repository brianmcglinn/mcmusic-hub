import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/colors';

export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backText}>{'‹'} Back</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { paddingVertical: 4 },
  backText: { fontFamily: fonts.bodySemiBold, color: colors.ice, fontSize: 15 },
  title: { flex: 1, fontFamily: fonts.bodyMedium, color: colors.chrome, fontSize: 15 },
});
