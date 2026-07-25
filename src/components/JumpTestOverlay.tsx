import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { JumpResult, JumpTestState } from '@/lib/jumpTest';
import type { Leg } from '@/lib/kneeFlexion';

type Props = {
  state: JumpTestState;
  stanceLeg: Leg | null;
  onStart: () => void;
  onCancel: () => void;
  onRestart: () => void;
  onClose: () => void;
};

export function JumpTestOverlay({
  state,
  stanceLeg,
  onStart,
  onCancel,
  onRestart,
  onClose,
}: Props) {
  if (state.kind === 'idle') {
    return (
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
      >
        <Text style={styles.startButtonText}>Start jump test</Text>
      </Pressable>
    );
  }

  if (state.kind === 'awaiting') {
    const stanceText =
      stanceLeg === null
        ? 'stance: —  stand on one leg'
        : stanceLeg === state.leg
          ? `stance: ${stanceLeg.toUpperCase()}  READY`
          : `stance: ${stanceLeg.toUpperCase()}  WRONG LEG`;
    const stanceColor =
      stanceLeg === null ? '#d1d5db' : stanceLeg === state.leg ? '#4ade80' : '#facc15';

    return (
      <View style={styles.fullscreen} pointerEvents="box-none">
        <View style={styles.awaitingContent} pointerEvents="box-none">
          <Text style={styles.stepLabel}>STEP {state.stepIndex} OF 2</Text>
          <Text style={styles.heading}>JUMP ON YOUR {state.leg.toUpperCase()} LEG</Text>
          <Text style={[styles.stanceLine, { color: stanceColor }]}>{stanceText}</Text>
        </View>
        <View style={styles.awaitingFooter} pointerEvents="box-none">
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const leftResult = state.results.find((r) => r.leg === 'left');
  const rightResult = state.results.find((r) => r.leg === 'right');
  const leftPeak = leftResult?.peakFlexionDeg ?? null;
  const rightPeak = rightResult?.peakFlexionDeg ?? null;

  const asymmetry =
    leftPeak !== null && rightPeak !== null ? Math.abs(leftPeak - rightPeak) : null;
  const asymmetryText =
    asymmetry === null ? 'Asymmetry: —' : `Asymmetry: ${asymmetry.toFixed(0)}°`;
  const asymmetryColor =
    asymmetry === null
      ? '#d1d5db'
      : asymmetry < 10
        ? '#4ade80'
        : asymmetry <= 20
          ? '#facc15'
          : '#f87171';

  return (
    <View style={styles.fullscreen} pointerEvents="box-none">
      <View style={styles.resultsCard} pointerEvents="box-none">
        <Text style={styles.resultsTitle}>RESULTS</Text>
        <View style={styles.columns}>
          <ResultColumn label="LEFT LEG" leg="left" result={leftResult} />
          <ResultColumn label="RIGHT LEG" leg="right" result={rightResult} />
        </View>
        <Text style={[styles.asymmetry, { color: asymmetryColor }]}>{asymmetryText}</Text>
        <View style={styles.resultsActions}>
          <Pressable
            onPress={onRestart}
            style={({ pressed }) => [styles.pillButton, pressed && styles.pillButtonPressed]}
          >
            <Text style={styles.pillButtonText}>Redo</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.pillButton, pressed && styles.pillButtonPressed]}
          >
            <Text style={styles.pillButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ResultColumn({
  label,
  leg,
  result,
}: {
  label: string;
  leg: Leg;
  result: JumpResult | undefined;
}) {
  const peakText =
    result?.peakFlexionDeg !== undefined && result.peakFlexionDeg !== null
      ? `${result.peakFlexionDeg.toFixed(0)}°`
      : '—';
  const flightText = result ? `${result.flightMs}ms` : '—';
  const mismatch =
    result && result.stanceLegDetected !== null && result.stanceLegDetected !== leg;

  return (
    <View style={styles.column}>
      <Text style={styles.columnHeader}>{label}</Text>
      <Text style={styles.columnStat}>Peak: {peakText}</Text>
      <Text style={styles.columnStat}>Flight: {flightText}</Text>
      {mismatch ? (
        <Text style={styles.mismatchNote}>used {result?.stanceLegDetected}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  startButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  startButtonText: {
    color: '#67e8f9',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  awaitingContent: {
    alignItems: 'center',
    gap: 12,
  },
  stepLabel: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heading: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  stanceLine: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  awaitingFooter: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cancelButtonText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  resultsCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 420,
  },
  resultsTitle: {
    color: '#67e8f9',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 16,
  },
  column: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  columnHeader: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  columnStat: {
    color: '#fff',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  mismatchNote: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  asymmetry: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  pillButton: {
    borderWidth: 1,
    borderColor: '#67e8f9',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  pillButtonPressed: {
    backgroundColor: 'rgba(103,232,249,0.15)',
  },
  pillButtonText: {
    color: '#67e8f9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
