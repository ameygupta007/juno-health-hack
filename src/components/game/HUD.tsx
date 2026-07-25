import { StyleSheet, Text, View } from 'react-native';

import { BALANCE_COLORS, type BalanceMetrics } from '@/lib/balance';

type Props = {
  chapterTitle: string;
  chapterSubtitle: string;
  msRemaining: number;
  caught: number;
  target: number;
  bonuses: number;
  balance: BalanceMetrics;
};

export function HUD({
  chapterTitle,
  chapterSubtitle,
  msRemaining,
  caught,
  target,
  bonuses,
  balance,
}: Props) {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const balanceOn = balance.state === 'stable';
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.topRow}>
        <View style={styles.chapterBadge}>
          <Text style={styles.chapterSub}>{chapterSubtitle}</Text>
          <Text style={styles.chapterTitle}>{chapterTitle}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timer}>{seconds}s</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {caught}
            <Text style={styles.statSlash}> / {target}</Text>
          </Text>
          <Text style={styles.statLabel}>stars</Text>
        </View>
        <View
          style={[
            styles.balanceBadge,
            { backgroundColor: BALANCE_COLORS[balance.state] + 'cc' },
          ]}
        >
          <Text style={styles.balanceLabel}>
            {balanceOn ? '2× BALANCED' : balance.state.toUpperCase()}
          </Text>
          <Text style={styles.balanceSub}>+{bonuses} bonus</Text>
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
  chapterBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chapterSub: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  chapterTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  timer: { color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
  balanceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'flex-end',
  },
  balanceLabel: { color: '#000', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  balanceSub: { color: '#000', fontSize: 11, opacity: 0.7 },
});
