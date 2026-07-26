import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Rect, RadialGradient, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Deterministic pseudo-random star field so positions are stable across
// renders without needing to persist them anywhere.
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

type Star = { x: number; y: number; r: number; twinkle: boolean };

const rand = seededRandom(42);
const STARS: Star[] = Array.from({ length: 22 }, (_, i) => ({
  x: rand() * 100,
  y: rand() * 100,
  r: 0.6 + rand() * 1.4,
  twinkle: i % 4 === 0,
}));

function TwinkleStar({ star, index }: { star: Star; index: number }) {
  const opacity = useSharedValue(0.25 + Math.random() * 0.3);

  useEffect(() => {
    opacity.value = withDelay(
      index * 220,
      withRepeat(withTiming(0.9, { duration: 1400 }), -1, true),
    );
  }, [index, opacity]);

  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedCircle
      cx={`${star.x}%`}
      cy={`${star.y}%`}
      r={star.r}
      fill="#f8fafc"
      animatedProps={animatedProps}
    />
  );
}

export function Starfield() {
  const reduceMotion = useReduceMotion();

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="warmGlow" cx="50%" cy="0%" r="75%">
          <Stop offset="0%" stopColor="#fbbf24" stopOpacity={0.16} />
          <Stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="coolGlow" cx="50%" cy="100%" r="75%">
          <Stop offset="0%" stopColor="#38bdf8" stopOpacity={0.16} />
          <Stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width="100%" height="100%" fill="#030714" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#warmGlow)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#coolGlow)" />

      {STARS.map((star, i) =>
        star.twinkle && !reduceMotion ? (
          <TwinkleStar key={i} star={star} index={i} />
        ) : (
          <Circle
            key={i}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.r}
            fill="#f8fafc"
            opacity={0.45}
          />
        ),
      )}
    </Svg>
  );
}
