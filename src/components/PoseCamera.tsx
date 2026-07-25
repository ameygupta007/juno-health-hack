import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  MediapipeCamera,
  RunningMode,
  usePoseDetection,
  type DetectionError,
  type PoseDetectionResultBundle,
  type ViewCoordinator,
} from 'react-native-mediapipe';

import { PoseOverlay } from '@/components/PoseOverlay';
import { useBalanceMetrics } from '@/hooks/useBalanceMetrics';
import { BALANCE_COLORS } from '@/lib/balance';
import type { PoseFrame } from '@/types/pose';

export function PoseCamera() {
  const [frame, setFrame] = useState<PoseFrame | null>(null);

  const onResults = useCallback(
    (results: PoseDetectionResultBundle, coordinator: ViewCoordinator) => {
      const landmarks = results.results[0]?.landmarks?.[0];
      if (!landmarks) {
        setFrame(null);
        return;
      }

      const frameDims = coordinator.getFrameDims(results);
      const mapped = landmarks.map((lm) => {
        const point = coordinator.convertPoint(frameDims, { x: lm.x, y: lm.y });
        return {
          x: point.x,
          y: point.y,
          z: lm.z,
          visibility: lm.visibility ?? 1,
        };
      });

      setFrame({ landmarks: mapped, timestamp: Date.now() });
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
  const { width, height } = detector.cameraViewDimensions;

  return (
    <View style={styles.container}>
      <MediapipeCamera style={styles.camera} solution={detector} activeCamera="front" />
      <PoseOverlay frame={frame} width={width} height={height} balance={balance} />
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
});
