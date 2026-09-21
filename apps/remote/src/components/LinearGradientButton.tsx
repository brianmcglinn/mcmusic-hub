import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, chromeGradient } from '../lib/colors';

// The chrome-fill primary button from the design system — five-stop
// gradient, reads as metal. Used for the one clear primary action per
// screen (Continue, Add a song).
export function LinearGradientButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={styles.wrap}>
      <LinearGradient
        colors={chromeGradient}
        locations={[0, 0.34, 0.52, 0.68, 1]}
        style={[styles.gradient, (disabled || loading) && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={colors.void} /> : <Text style={styles.label}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    shadowColor: colors.ice,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  gradient: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.void },
});
