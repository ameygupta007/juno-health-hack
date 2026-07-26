import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';

type Accent = 'amber' | 'sky';

type Props = {
  accent: Accent;
  eyebrow: string;
  title: string;
  body: string;
  glyph: 'star' | 'rail';
  onPress: () => void;
};

const ACCENT_COLORS: Record<Accent, string> = {
  amber: '#fbbf24',
  sky: '#38bdf8',
};

function Glyph({ kind, color }: { kind: 'star' | 'rail'; color: string }) {
  if (kind === 'star') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="1.6" fill={color} />
        <Line x1="12" y1="2" x2="12" y2="9" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1="12" y1="15" x2="12" y2="22" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1="2" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1="15" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="2" y1="15" x2="22" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6" y1="5" x2="6" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="5" x2="18" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ModeCard({ accent, eyebrow, title, body, glyph, onPress }: Props) {
  const color = ACCENT_COLORS[accent];
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (!reduceMotion) scale.value = withTiming(0.97, { duration: 100 });
  };
  const onPressOut = () => {
    if (!reduceMotion) scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.aura, { backgroundColor: color }]} pointerEvents="none" />
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${body}`}
          style={[
            styles.card,
            { borderColor: withOpacity(color, 0.4) },
            Platform.select({
              ios: { shadowColor: color },
              default: {},
            }),
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color }]}>{eyebrow}</Text>
            <Glyph kind={glyph} color={color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function withOpacity(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  aura: {
    position: 'absolute',
    top: 8,
    bottom: -6,
    left: 12,
    right: 12,
    borderRadius: 28,
    opacity: 0.14,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
});
