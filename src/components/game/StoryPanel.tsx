import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

// Full-screen dim overlay used for menu, chapter intro, results and epilogue.
// Everything in the game story flow shares this look so the transitions feel
// like turning a page rather than jumping between screens.
export function StoryPanel({
  eyebrow,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.buttons}>
          {secondaryLabel && onSecondary ? (
            <Pressable style={[styles.button, styles.secondary]} onPress={onSecondary}>
              <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.button, styles.primary]} onPress={onPrimary}>
            <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
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
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  eyebrow: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 16,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primary: { backgroundColor: '#fbbf24' },
  primaryLabel: { color: '#0f172a', fontWeight: '800', letterSpacing: 0.5 },
  secondary: { backgroundColor: 'rgba(255,255,255,0.08)' },
  secondaryLabel: { color: '#cbd5e1', fontWeight: '600' },
});
