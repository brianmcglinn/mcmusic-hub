import { StyleSheet, View } from 'react-native';
import { colors } from '../lib/colors';

// Static Ice-colored frame — no color cycling. Used around the YouTube
// WebView so it reads as part of the same brand system as everything
// else, without needing its own glow (glow lives on the border itself).
export function NeonBorder({
  width,
  height,
  borderWidth = 4,
  children,
}: {
  width: number;
  height: number;
  borderWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          borderWidth,
          borderRadius: 14,
          borderColor: colors.ice,
          shadowColor: colors.ice,
          shadowOpacity: 0.5,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
