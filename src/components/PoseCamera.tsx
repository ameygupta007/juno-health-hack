import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MediapipeCamera,
  RunningMode,
  usePoseDetection,
  type DetectionError,
  type PoseDetectionResultBundle,
  type ViewCoordinator,
} from 'react-native-mediapipe';

import { PoseOverlay } from '@/components/PoseOverlay';
import { FlightTimeHud } from '@/components/FlightTimeHud';
import { useBalanceMetrics } from '@/hooks/useBalanceMetrics';
import { useFlightTime } from '@/hooks/useFlightTime';
import { useKneeFlexionMetrics } from '@/hooks/useKneeFlexionMetrics';
import { BALANCE_COLORS } from '@/lib/balance';
import type { NormalizedLandmark, PoseFrame } from '@/types/pose';

export function PoseCamera() {
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const onResults = useCallback(
    (results: PoseDetectionResultBundle, coordinator: ViewCoordinator) => {
      const landmarks = results.results[0]?.landmarks?.[0];
      if (!landmarks) {
        setFrame(null);
        return;
      }

      const frameDims = coordinator.getFrameDims(results);
      const normalized: NormalizedLandmark[] = landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 1,
      }));
      const mapped = landmarks.map((lm) => {
        const point = coordinator.convertPoint(frameDims, { x: lm.x, y: lm.y });
        return {
          x: point.x,
          y: point.y,
          z: lm.z,
          visibility: lm.visibility ?? 1,
        };
      });

      setFrame({
        landmarks: mapped,
        normalizedLandmarks: normalized,
        timestamp: Date.now(),
      });
    },
    [],
  );

  const onError = useCallback((err: DetectionError) => {
    console.warn('[PoseCamera] detector error', err);
  }, []);

  const detector = usePoseDetection(
    { onResults, onError },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    { numPoses: 1, minPoseDetectionConfidence: 0.5 },
  );

  const balance = useBalanceMetrics(frame);
  const flightTime = useFlightTime(frame);
  const knee = useKneeFlexionMetrics(frame, resetKey);
  const { width, height } = detector.cameraViewDimensions;

  const stanceLabel = knee.stanceLeg === null ? '—' : knee.stanceLeg.toUpperCase();
  const kneeCurrent =
    knee.currentAngleDeg === null ? '—' : `${knee.currentAngleDeg.toFixed(1)}°`;
  const kneePeak =
    knee.peakFlexionDeg === null
      ? '—'
      : `${knee.peakFlexionDeg.toFixed(1)}° (${knee.peakLeg ?? '—'})`;

  return (
    <View style={styles.container}>
      <MediapipeCamera style={styles.camera} solution={detector} activeCamera="front" />
      <PoseOverlay frame={frame} width={width} height={height} balance={balance} />
      <FlightTimeHud metrics={flightTime} />
      <View style={styles.hud} pointerEvents="none">
        <Text style={[styles.hudBadge, { backgroundColor: BALANCE_COLORS[balance.state] }]}>
          {balance.state.toUpperCase()}
        </Text>
        <Text style={styles.hudText}>
          lean {balance.lateralOffset.toFixed(2)}  ·  tilt {balance.shoulderTiltDeg.toFixed(1)}°
        </Text>
        <Text style={styles.hudText}>
          sway {balance.swayPx.toFixed(1)}px
        </Text>
        <Text style={styles.hudText}>stance {stanceLabel}</Text>
        <Text style={styles.hudText}>knee {kneeCurrent}</Text>
        <Text style={styles.hudText}>peak {kneePeak}</Text>
      </View>
      <View style={styles.hudActions}>
        <Pressable
          onPress={() => setResetKey((k) => k + 1)}
          style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
        >
          <Text style={styles.resetButtonText}>Reset peak</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 60,
    left: 20,
    gap: 4,
  },
  hudBadge: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  hudText: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hudActions: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },
  resetButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
