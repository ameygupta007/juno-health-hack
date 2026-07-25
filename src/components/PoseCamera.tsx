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

  const { width, height } = detector.cameraViewDimensions;

  return (
    <View style={styles.container}>
      <MediapipeCamera style={styles.camera} solution={detector} activeCamera="front" />
      <PoseOverlay frame={frame} width={width} height={height} />
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>
          {frame ? `${frame.landmarks.length} landmarks` : 'searching…'}
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hudText: { color: '#fff', fontSize: 12, fontVariant: ['tabular-nums'] },
});
