import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MetricTile } from '@/components/dashboard/MetricTile';
import { SymmetryChart } from '@/components/dashboard/SymmetryChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  flexionAsymmetryDeg,
  flightAsymmetryMs,
  latestSession,
  readiness,
  readinessLabel,
  symmetryThresholdMs,
} from '@/data/patients';
import type { Patient } from '@/data/types';

const LEFT_COLOR = '#fbbf24';
const RIGHT_COLOR = '#38bdf8';

const VERDICT_COPY: Record<ReturnType<typeof readiness>, { color: string; text: string }> = {
  improving: { color: '#4ade80', text: 'Symmetry restored and stable. On track for return-to-sport testing.' },
  steady: { color: '#facc15', text: 'Progress is steady but asymmetry remains above target. Continue current plan.' },
  flagged: { color: '#ef4444', text: 'Asymmetry has not closed and valgus events persist. Recommend review.' },
};

type Props = {
  patient: Patient;
  onBack: () => void;
};

export function PatientDetailScreen({ patient, onBack }: Props) {
  const status = readiness(patient);
  const verdict = VERDICT_COPY[status];
  const latest = latestSession(patient);
  const weeks = patient.sessions.map((s) => s.week);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to roster">
          <Text style={styles.back}>‹ Patients</Text>
        </Pressable>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.procedure}>{patient.procedure}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.verdictCard, { borderColor: verdict.color }]}>
          <Text style={[styles.verdictTitle, { color: verdict.color }]}>{readinessLabel(status)}</Text>
          <Text style={styles.verdictBody}>{verdict.text}</Text>
        </View>

        <SymmetryChart
          weeks={weeks}
          leftValues={patient.sessions.map((s) => s.jump.leftFlightMs)}
          rightValues={patient.sessions.map((s) => s.jump.rightFlightMs)}
          thresholds={patient.sessions.map(symmetryThresholdMs)}
          unit="ms"
          leftColor={LEFT_COLOR}
          rightColor={RIGHT_COLOR}
        />

        <TrendChart
          title="Flight time"
          unit="milliseconds"
          weeks={weeks}
          series={[
            { id: 'left', label: 'Left', color: LEFT_COLOR, values: patient.sessions.map((s) => s.jump.leftFlightMs) },
            { id: 'right', label: 'Right', color: RIGHT_COLOR, values: patient.sessions.map((s) => s.jump.rightFlightMs) },
          ]}
        />

        <TrendChart
          title="Peak knee flexion"
          unit="degrees"
          weeks={weeks}
          series={[
            { id: 'left', label: 'Left', color: LEFT_COLOR, values: patient.sessions.map((s) => s.jump.leftPeakFlexionDeg) },
            { id: 'right', label: 'Right', color: RIGHT_COLOR, values: patient.sessions.map((s) => s.jump.rightPeakFlexionDeg) },
          ]}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <TrendChart
              title="Valgus events"
              unit="per run"
              weeks={weeks}
              height={130}
              series={[{ id: 'events', label: 'Rail Grind', color: '#ef4444', values: patient.sessions.map((s) => s.rail.eventCount) }]}
            />
          </View>
          <View style={styles.half}>
            <TrendChart
              title="Longest clean grind"
              unit="seconds"
              weeks={weeks}
              height={130}
              formatValue={(v) => v.toFixed(1)}
              series={[
                {
                  id: 'streak',
                  label: 'Rail Grind',
                  color: '#4ade80',
                  values: patient.sessions.map((s) => s.rail.bestStreakMs / 1000),
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Latest session — week {latest.week}</Text>
          <View style={styles.tiles}>
            <MetricTile label="Flight asymmetry" value={`${Math.round(flightAsymmetryMs(latest))} ms`} />
            <MetricTile label="Flexion asymmetry" value={`${Math.round(flexionAsymmetryDeg(latest))}°`} />
            <MetricTile label="Wipeouts" value={`${latest.rail.wipeouts}`} />
            <MetricTile label="Score" value={`${latest.rail.score}`} />
          </View>
          {latest.rail.fatigue ? (
            <Text style={styles.fatigue}>Collapses clustered late in the run — glute fatigue suspected.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030714',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  back: {
    color: '#7c8aa5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  name: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
  },
  procedure: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 14,
  },
  verdictCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  verdictBody: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
  },
  statsTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fatigue: {
    color: '#facc15',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 12,
  },
});
