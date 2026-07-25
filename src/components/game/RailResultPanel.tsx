import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RailRunSummary } from '@/game/types';

type Props = {
  summary: RailRunSummary;
  onPlayAgain: () => void;
  onExit: () => void;
};

// The "Joint Alignment" clinician-facing dashboard, shown after a run —
// mirrors the StoryPanel scrim/card look but with stat rows instead of prose.
export function RailResultPanel({ summary, onPlayAgain, onExit }: Props) {
  const highRisk = summary.eventCount > 0;
  const longestCleanSec = (summary.bestStreakMs / 1000).toFixed(1);

  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>JOINT ALIGNMENT DASHBOARD</Text>
        <Text style={[styles.title, { color: highRisk ? '#ef4444' : '#4ade80' }]}>
          {highRisk ? 'HIGH RISK' : 'Stable'}
        </Text>
        <Text style={styles.subtitle}>
          {highRisk
            ? `Dynamic valgus detected on ${summary.eventCount} landing${summary.eventCount === 1 ? '' : 's'}.`
            : 'Zero valgus collapses detected.'}
        </Text>

        <View style={styles.stats}>
          <StatRow label="Valgus events" value={`${summary.eventCount}`} />
          <StatRow label="Wipeouts" value={`${summary.wipeouts}`} />
          <StatRow label="Longest clean grind" value={`${longestCleanSec}s`} />
          <StatRow label="Score" value={`${summary.score}`} />
        </View>

        {summary.fatigue ? (
          <Text style={styles.fatigue}>
            Collapses clustered late in the run — glute fatigue suspected.
          </Text>
        ) : null}

        <View style={styles.buttons}>
          <Pressable style={[styles.button, styles.secondary]} onPress={onExit}>
            <Text style={styles.secondaryLabel}>Back to menu</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.primary]} onPress={onPlayAgain}>
            <Text style={styles.primaryLabel}>Run again</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 20, 0.78)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  eyebrow: { color: '#38bdf8', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 4 },
  subtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  stats: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: { color: '#94a3b8', fontSize: 14 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  fatigue: {
    color: '#facc15',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primary: { backgroundColor: '#38bdf8' },
  primaryLabel: { color: '#0f172a', fontWeight: '800', letterSpacing: 0.5 },
  secondary: { backgroundColor: 'rgba(255,255,255,0.08)' },
  secondaryLabel: { color: '#cbd5e1', fontWeight: '600' },
});
