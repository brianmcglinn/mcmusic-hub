import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, G, Rect } from 'react-native-svg';
import { colors, fonts } from '../lib/colors';

// The actual brand mark — a ring plus four bars (an equalizer motif),
// filled with the chrome gradient. Same geometry as masters/mcmusichub-mark.svg
// and the inline SVG used throughout the design canvas mockups, ported to
// react-native-svg rather than raw HTML SVG.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="ch" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.34" stopColor="#C6D0DE" />
          <Stop offset="0.52" stopColor="#6F7989" />
          <Stop offset="0.68" stopColor="#EAF1F9" />
          <Stop offset="1" stopColor="#8E99A9" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="256"
        cy="256"
        r="146"
        fill="none"
        stroke="url(#ch)"
        strokeWidth="30"
        strokeLinecap="round"
        strokeDasharray="688 230"
        transform="rotate(-18 256 256)"
      />
      <G fill="url(#ch)">
        <Rect x="180" y="210" width="26" height="92" rx="13" />
        <Rect x="222" y="170" width="26" height="172" rx="13" />
        <Rect x="264" y="146" width="26" height="220" rx="13" />
        <Rect x="306" y="194" width="26" height="124" rx="13" />
      </G>
    </Svg>
  );
}

// Mark + wordmark together, matching the header treatment in the design
// canvas's CastScreen/AppScreen mockups exactly.
export function LogoWithWordmark({ markSize = 28, textSize = 17 }: { markSize?: number; textSize?: number }) {
  return (
    <View style={styles.row}>
      <View style={{ shadowColor: colors.ice, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}>
        <LogoMark size={markSize} />
      </View>
      <Text style={[styles.wordmark, { fontSize: textSize }]}>McMusic Hub</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.display, color: colors.chrome, letterSpacing: -0.2 },
});
