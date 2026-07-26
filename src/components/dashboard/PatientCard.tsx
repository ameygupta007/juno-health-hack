import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/dashboard/Sparkline';
import { flightAsymmetryMs, readiness, readinessLabel } from '@/data/patients';
import type { Patient } from '@/data/types';

const READINESS_COLOR: Record<ReturnType<typeof readiness>, string> = {
  improving: '#4ade80',
  steady: '#facc15',
  flagged: '#ef4444',
};

type Props = {
  patient: Patient;
  onPress: () => void;
};

export function PatientCard({ patient, onPress }: Props) {
  const status = readiness(patient);
  const color = READINESS_COLOR[status];
  const asymmetryTrend = patient.sessions.map(flightAsymmetryMs);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${patient.name}, ${readinessLabel(status)}`}
      style={styles.card}
    >
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{patient.name}</Text>
          <View style={[styles.chip, { borderColor: color }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.chipLabel, { color }]}>{readinessLabel(status)}</Text>
          </View>
        </View>
        <Text style={styles.procedure}>{patient.procedure}</Text>
        <Text style={styles.weeks}>Week {patient.weeksInProgram} of program</Text>
      </View>
      <Sparkline values={asymmetryTrend} color={color} invert />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  name: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  procedure: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  weeks: {
    color: '#7c8aa5',
    fontSize: 12,
    marginTop: 2,
  },
});
