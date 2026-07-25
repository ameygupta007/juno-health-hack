import { StyleSheet, Text, View } from 'react-native';

import { ALIGNMENT_COLORS, type KneeAlignment } from '@/lib/valgus';

type Props = {
  msRemaining: number;
  score: number;
  multiplier: number;
  alignment: KneeAlignment;
  isWipeout: boolean;
};

const STATE_LABEL: Record<KneeAlignment['state'], string> = {
  unknown: 'FIND STANCE',
  stacked: 'STACKED',
  wobble: 'WOBBLE',
  valgus: 'HIGH RISK',
};

export function RailHUD({ msRemaining, score, multiplier, alignment, isWipeout }: Props) {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000));
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.topRow}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleSub}>BALANCE · SINGLE-LEG SQUAT</Text>
          <Text style={styles.title}>Rail Grind Pro</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timer}>{seconds}s</Text>
        </View>
      </View>

      {isWipeout ? (
        <View style={styles.wipeoutBanner}>
          <Text style={styles.wipeoutText}>WIPEOUT</Text>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.round(score)}
            <Text style={styles.statSlash}> ×{multiplier}</Text>
          </Text>
          <Text style={styles.statLabel}>score</Text>
        </View>
        <View style={[styles.alignBadge, { backgroundColor: ALIGNMENT_COLORS[alignment.state] + 'cc' }]}>
          <Text style={styles.alignLabel}>{STATE_LABEL[alignment.state]}</Text>
          <Text style={styles.alignSub}>
            {alignment.state === 'unknown' ? 'balance on one leg' : `${alignment.smoothedDeg.toFixed(0)}° drift`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  titleSub: { color: '#38bdf8', fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  timer: { color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  wipeoutBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  wipeoutText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stat: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statSlash: { color: '#94a3b8', fontSize: 18, fontWeight: '500' },
  statLabel: { color: '#94a3b8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  alignBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'flex-end',
  },
  alignLabel: { color: '#000', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  alignSub: { color: '#000', fontSize: 11, opacity: 0.7 },
});
