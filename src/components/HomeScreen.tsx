import { Pressable, StyleSheet, Text, View } from 'react-native';

type Game = 'jump' | 'rail';

type Props = {
  onSelect: (game: Game) => void;
};

export function HomeScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>JUNO HEALTH</Text>
      <Text style={styles.title}>Choose your session</Text>

      <Pressable style={[styles.card, styles.starfallCard]} onPress={() => onSelect('jump')}>
        <Text style={[styles.cardEyebrow, styles.starfallEyebrow]}>FLIGHT TIME · KNEE FLEXION</Text>
        <Text style={styles.cardTitle}>Jump Test</Text>
        <Text style={styles.cardBody}>
          Take a guided one-leg jump test. We track flight time, landing stance, and peak
          knee flexion in real time.
        </Text>
      </Pressable>

      <Pressable style={[styles.card, styles.railCard]} onPress={() => onSelect('rail')}>
        <Text style={[styles.cardEyebrow, styles.railEyebrow]}>SINGLE-LEG SQUAT · JOINT ALIGNMENT</Text>
        <Text style={styles.cardTitle}>Rail Grind Pro</Text>
        <Text style={styles.cardBody}>
          Hold a single-leg squat and grind down the rail. Keep your knee stacked over your
          ankle — collapse inward and you wipe out.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030714',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  starfallCard: { borderColor: 'rgba(251, 191, 36, 0.35)' },
  railCard: { borderColor: 'rgba(56, 189, 248, 0.35)' },
  cardEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  starfallEyebrow: { color: '#fbbf24' },
  railEyebrow: { color: '#38bdf8' },
  cardTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  cardBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
});
