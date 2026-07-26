import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export function MetricTile({ label, value, accent = '#f8fafc' }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
