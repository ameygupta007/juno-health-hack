import { StyleSheet, Text, View } from 'react-native';

import type { FlightTimeMetrics } from '@/lib/flightTime';

type Props = {
  metrics: FlightTimeMetrics;
};

export function FlightTimeHud({ metrics }: Props) {
  const displayMs =
    metrics.phase === 'airborne'
      ? metrics.currentFlightMs
      : (metrics.lastFlightMs ?? 0);

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.label}>
        {metrics.phase === 'calibrating'
          ? `CALIBRATING ${Math.round(metrics.calibrationProgress * 100)}%`
          : metrics.phase === 'tracking-lost'
            ? 'FEET NOT VISIBLE'
            : metrics.phase === 'airborne'
              ? 'IN THE AIR'
              : 'LAST FLIGHT'}
      </Text>
      <Text style={styles.time}>{(displayMs / 1000).toFixed(2)}s</Text>
      <Text style={styles.count}>jumps {metrics.jumpCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  count: {
    color: '#d1d5db',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
