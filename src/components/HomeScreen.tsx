import { StyleSheet, Text, View } from 'react-native';

import { ModeCard } from '@/components/home/ModeCard';
import { Starfield } from '@/components/home/Starfield';

type Game = 'jump' | 'rail';

type Props = {
  onSelect: (game: Game) => void;
};

export function HomeScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Starfield />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>JUNO</Text>
          <Text style={styles.eyebrow}>H E A L T H</Text>
          <Text style={styles.prompt}>Choose how you&apos;ll move today</Text>
        </View>

        <View style={styles.cards}>
          <ModeCard
            accent="amber"
            eyebrow="FLIGHT TIME · KNEE FLEXION"
            title="Jump Test"
            body="Take a guided one-leg jump test. We track flight time, landing stance, and peak knee flexion in real time."
            glyph="star"
            onPress={() => onSelect('jump')}
          />
          <ModeCard
            accent="sky"
            eyebrow="SINGLE-LEG SQUAT · ALIGNMENT"
            title="Rail Grind Pro"
            body="Hold a single-leg squat and grind down the rail. Keep your knee stacked over your ankle."
            glyph="rail"
            onPress={() => onSelect('rail')}
          />
        </View>

        <Text style={styles.footer}>Tap a mode to begin</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030714',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  },
  header: {
    alignItems: 'center',
  },
  wordmark: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
  eyebrow: {
    color: '#7c8aa5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
  },
  prompt: {
    color: '#cbd5e1',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  cards: {
    gap: 22,
  },
  footer: {
    color: '#7c8aa5',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
