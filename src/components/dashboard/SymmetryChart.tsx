import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

type Props = {
  weeks: number[];
  leftValues: number[];
  rightValues: number[];
  thresholds: number[]; // full L/R symmetry threshold per week, same units as values
  unit: string;
  leftColor?: string;
  rightColor?: string;
};

const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 22;
const HEIGHT = 200;

// The Symmetry Spine — left/right leg values fan out from a center spine and
// visibly converge toward it as L/R symmetry is restored, with a shaded
// return-to-sport threshold band around the spine.
export function SymmetryChart({
  weeks,
  leftValues,
  rightValues,
  thresholds,
  unit,
  leftColor = '#fbbf24',
  rightColor = '#38bdf8',
}: Props) {
  const [width, setWidth] = useState(0);

  // Deviation from the per-week midpoint; left and right are exact mirrors.
  const half = leftValues.map((l, i) => (l - rightValues[i]) / 2);
  const maxAbsHalf = Math.max(...half.map(Math.abs), ...thresholds.map((t) => t / 2), 1);
  const scale = maxAbsHalf * 1.25;

  const plotW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const spineY = PAD_TOP + plotH / 2;

  const xFor = (i: number) => PAD_LEFT + (weeks.length > 1 ? (i / (weeks.length - 1)) * plotW : plotW / 2);
  const yFor = (dev: number) => spineY - (dev / scale) * (plotH / 2);

  const leftPath = buildLinePath(half.map((h, i) => ({ x: xFor(i), y: yFor(h) })));
  const rightPath = buildLinePath(half.map((h, i) => ({ x: xFor(i), y: yFor(-h) })));

  const latestThreshold = thresholds[thresholds.length - 1] ?? 0;
  const bandHalf = latestThreshold / 2;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>SYMMETRY SPINE</Text>
      <Text style={styles.title}>Left / right flight time</Text>
      <Text style={styles.subtitle}>Converges to the spine as symmetry restores</Text>

      <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Rect
              x={PAD_LEFT}
              y={yFor(bandHalf)}
              width={plotW}
              height={Math.max(yFor(-bandHalf) - yFor(bandHalf), 0)}
              fill="rgba(74, 222, 128, 0.10)"
            />
            <Line
              x1={PAD_LEFT}
              y1={spineY}
              x2={PAD_LEFT + plotW}
              y2={spineY}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              strokeDasharray="3,4"
            />
            <SvgText x={PAD_LEFT} y={yFor(bandHalf) - 4} fill="#4ade80" fontSize={9} fontWeight="700">
              RETURN-TO-SPORT ZONE
            </SvgText>

            <Path d={leftPath} stroke={leftColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={rightPath} stroke={rightColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />

            <SvgText x={PAD_LEFT} y={HEIGHT - 4} fill="#7c8aa5" fontSize={10}>
              {`Wk ${weeks[0]}`}
            </SvgText>
            <SvgText x={PAD_LEFT + plotW} y={HEIGHT - 4} fill="#7c8aa5" fontSize={10} textAnchor="end">
              {`Wk ${weeks[weeks.length - 1]}`}
            </SvgText>
          </Svg>
        ) : null}
      </View>

      <View style={styles.legend}>
        <LegendItem color={leftColor} label="Left leg" />
        <LegendItem color={rightColor} label="Right leg" />
      </View>
      <Text style={styles.unit}>Deviation from weekly midpoint · {unit}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
  },
  eyebrow: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  unit: {
    color: '#7c8aa5',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
