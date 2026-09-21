import { View, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

// Static low-opacity Ice wash over a blurred backdrop — no color cycling,
// matching the single-accent system. Kept as its own component (rather
// than inlined at each call site) since several screens use it.
export function NeonTint({ opacity = 0.1 }: { opacity?: number }) {
  return <View pointerEvents="none" style={[styles.fill, { backgroundColor: colors.ice, opacity }]} />;
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
