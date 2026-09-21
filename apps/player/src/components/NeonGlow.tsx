import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '../lib/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PULSE_DURATION_MS = 4200;

// A genuine soft-edged glow via an SVG radial gradient (fading fully to
// transparent at the outer edge), replacing the earlier flat-opacity
// solid circles — those read as faint rings, not a glow, since a
// hard-edged circle behind opaque artwork has no actual soft falloff.
// Single Ice accent, gentle pulse via an animated radius. "One glowing
// thing per view, never two."
export function NeonGlow({ size }: { size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const canvasSize = size * 1.7;
  const baseR = size * 0.62;

  const animatedProps = useAnimatedProps(() => ({
    r: baseR * (1 + 0.1 * progress.value),
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: canvasSize,
          height: canvasSize,
          left: (size - canvasSize) / 2,
          top: (size - canvasSize) / 2,
        },
      ]}
    >
      <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.ice} stopOpacity={0.6} />
            <Stop offset="55%" stopColor={colors.ice} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={colors.ice} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle cx={canvasSize / 2} cy={canvasSize / 2} animatedProps={animatedProps} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
