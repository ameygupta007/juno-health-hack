import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  invert?: boolean; // true when lower values are the "better" direction
};

// Tiny trend line for roster rows — shows shape, not scale.
export function Sparkline({ values, color, width = 72, height = 26, invert = false }: Props) {
  if (values.length < 2) {
    return <View style={[styles.wrap, { width, height }]} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
    const norm = (v - min) / range;
    const y = invert
      ? norm * (height - pad * 2) + pad
      : (1 - norm) * (height - pad * 2) + pad;
    return { x, y };
  });

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={last.x} cy={last.y} r={2.5} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
});
