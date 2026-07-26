import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

type Props = {
  title: string;
  unit: string;
  weeks: number[];
  series: ChartSeries[];
  height?: number;
  // Optional shaded band, e.g. a clinical target zone.
  band?: { max: number; label: string };
  formatValue?: (v: number) => string;
};

const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 22;

// Reusable multi-series SVG line chart: axes, week ticks, optional target band.
export function TrendChart({
  title,
  unit,
  weeks,
  series,
  height = 160,
  band,
  formatValue = (v) => `${Math.round(v)}`,
}: Props) {
  const [width, setWidth] = useState(0);

  const allValues = series.flatMap((s) => s.values).concat(band ? [band.max] : []);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const valueSpan = rawMax - rawMin || 1;
  const min = rawMin - valueSpan * 0.12;
  const max = rawMax + valueSpan * 0.12;
  const span = max - min || 1;

  const plotW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (weeks.length > 1 ? (i / (weeks.length - 1)) * plotW : plotW / 2);
  const yFor = (v: number) => PAD_TOP + (1 - (v - min) / span) * plotH;

  const pathFor = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
      .join(' ');

  const tickIdx = weeks.length > 1 ? [0, weeks.length - 1] : [0];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {band ? (
              <Rect
                x={PAD_LEFT}
                y={yFor(band.max)}
                width={plotW}
                height={Math.max(yFor(min) - yFor(band.max), 0)}
                fill="rgba(74, 222, 128, 0.08)"
              />
            ) : null}

            <Line
              x1={PAD_LEFT}
              y1={PAD_TOP + plotH}
              x2={PAD_LEFT + plotW}
              y2={PAD_TOP + plotH}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />

            <SvgText x={4} y={yFor(max) + 4} fill="#7c8aa5" fontSize={10}>
              {formatValue(max)}
            </SvgText>
            <SvgText x={4} y={yFor(min) + 4} fill="#7c8aa5" fontSize={10}>
              {formatValue(min)}
            </SvgText>

            {tickIdx.map((i) => (
              <SvgText
                key={i}
                x={xFor(i)}
                y={height - 4}
                fill="#7c8aa5"
                fontSize={10}
                textAnchor={i === 0 ? 'start' : 'end'}
              >
                {`Wk ${weeks[i]}`}
              </SvgText>
            ))}

            {series.map((s) => (
              <Path
                key={s.id}
                d={pathFor(s.values)}
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {series.map((s) => {
              const last = s.values.length - 1;
              return (
                <Circle
                  key={`${s.id}-dot`}
                  cx={xFor(last)}
                  cy={yFor(s.values[last])}
                  r={3.5}
                  fill={s.color}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#94a3b8',
    fontSize: 11,
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
