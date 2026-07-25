import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RunningMode,
  usePoseDetection,
  type DetectionError,
  type PoseDetectionResultBundle,
  type ViewCoordinator,
} from 'react-native-mediapipe';
import { Camera } from 'react-native-vision-camera';

import { PoseOverlay } from '@/components/PoseOverlay';
import { FlightTimeHud } from '@/components/FlightTimeHud';
import { JumpTestOverlay } from '@/components/JumpTestOverlay';
import { RecordableMediapipeCamera } from '@/components/RecordableMediapipeCamera';
import { RecordingReview } from '@/components/RecordingReview';
import { useBalanceMetrics } from '@/hooks/useBalanceMetrics';
import { useFlightTime } from '@/hooks/useFlightTime';
import { useJumpTest } from '@/hooks/useJumpTest';
import { useKneeFlexionMetrics } from '@/hooks/useKneeFlexionMetrics';
import { useSupportLeg } from '@/hooks/useSupportLeg';
import { BALANCE_COLORS } from '@/lib/balance';
import type { NormalizedLandmark, PoseFrame } from '@/types/pose';

export function PoseCamera() {
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [peakResetKey, setPeakResetKey] = useState(0);
  const [supportResetKey, setSupportResetKey] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const reviewOnRecordingFinishRef = useRef(false);

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
  const support = useSupportLeg(frame, supportResetKey);
  const liveSupportLeg =
    support.metrics.state === 'LEFT_SUPPORT'
      ? 'left'
      : support.metrics.state === 'RIGHT_SUPPORT'
        ? 'right'
        : null;
  const selectedSupportLeg =
    support.metrics.lockedSupportLeg ?? liveSupportLeg;
  const { metrics: flightTime, reset: resetFlightTime } = useFlightTime(
    frame,
    support.metrics,
  );
  const knee = useKneeFlexionMetrics(
    frame,
    peakResetKey,
    selectedSupportLeg,
    flightTime.phase === 'airborne',
  );
  const resetPeak = useCallback(() => setPeakResetKey((key) => key + 1), []);
  const jumpTest = useJumpTest({
    flightMetrics: flightTime,
    kneeMetrics: knee,
    supportMetrics: support.metrics,
    onResetPeak: resetPeak,
    onLockSupport: support.lockCurrentSupport,
    onUnlockSupport: support.unlockSupport,
  });
  const { width, height } = detector.cameraViewDimensions;

  const stanceLabel =
    selectedSupportLeg === null ? '—' : selectedSupportLeg.toUpperCase();
  const airborneLabel =
    knee.airborneLeg === null ? '—' : knee.airborneLeg.toUpperCase();
  const kneeCurrent =
    knee.currentAngleDeg === null ? '—' : `${knee.currentAngleDeg.toFixed(1)}°`;
  const peakAngleText =
    knee.peakFlexionDeg === null ? '—' : `${knee.peakFlexionDeg.toFixed(0)}°`;
  const peakLegText = knee.peakLeg === null ? '' : knee.peakLeg.toUpperCase();

  const startRecording = useCallback(() => {
    if (!cameraRef.current || isRecording || isSaving) return;

    setVideoUri(null);
    reviewOnRecordingFinishRef.current = false;
    setIsRecording(true);
    try {
      cameraRef.current.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: (video) => {
          const uri = video.path.startsWith('file://')
            ? video.path
            : `file://${video.path}`;
          if (reviewOnRecordingFinishRef.current) {
            setVideoUri(uri);
            setReviewVisible(true);
          } else {
            setVideoUri(null);
          }
          setIsRecording(false);
          setIsSaving(false);
        },
        onRecordingError: (error) => {
          console.warn('[PoseCamera] recording error', error);
          setIsRecording(false);
          setIsSaving(false);
          Alert.alert('Recording failed', 'The camera could not save this recording.');
        },
      });
    } catch (error) {
      console.warn('[PoseCamera] could not start recording', error);
      setIsRecording(false);
      Alert.alert('Recording failed', 'The camera could not start recording.');
    }
  }, [isRecording, isSaving]);

  const stopRecording = useCallback(async (reviewWhenFinished: boolean) => {
    if (!cameraRef.current || !isRecording || isSaving) return;
    reviewOnRecordingFinishRef.current = reviewWhenFinished;
    setIsSaving(true);
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.warn('[PoseCamera] could not stop recording', error);
      setIsRecording(false);
      setIsSaving(false);
      Alert.alert('Recording failed', 'The camera could not finish the MP4.');
    }
  }, [isRecording, isSaving]);

  const previousJumpKindRef = useRef(jumpTest.state.kind);
  useEffect(() => {
    const previous = previousJumpKindRef.current;
    const current = jumpTest.state.kind;

    if (
      current === 'awaiting' &&
      (previous === 'idle' || previous === 'complete')
    ) {
      startRecording();
    } else if (previous === 'awaiting' && current === 'complete') {
      void stopRecording(true);
    } else if (previous === 'awaiting' && current === 'idle') {
      void stopRecording(false);
    }
    previousJumpKindRef.current = current;
  }, [jumpTest.state.kind, startRecording, stopRecording]);

  return (
    <View style={styles.container}>
      <RecordableMediapipeCamera
        ref={cameraRef}
        style={styles.camera}
        solution={detector}
        activeCamera="front"
        isActive={!reviewVisible}
      />
      <PoseOverlay
        frame={frame}
        width={width}
        height={height}
        balance={balance}
        support={support.metrics}
      />
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
        <Text style={styles.hudText}>airborne {airborneLabel}</Text>
        <Text style={styles.hudText}>{support.metrics.state.replace('_', ' ')}</Text>
        <Text style={styles.hudText}>
          contact L {formatContact(support.metrics.leftContact)} · R{' '}
          {formatContact(support.metrics.rightContact)}
        </Text>
        <Text style={styles.hudText}>
          foot vis L {support.metrics.leftFootVisibility.toFixed(2)} · R{' '}
          {support.metrics.rightFootVisibility.toFixed(2)}
        </Text>
        <Text style={styles.hudText}>
          {support.metrics.isCalibrated
            ? `ground ${support.metrics.groundY?.toFixed(3)}`
            : `calibrating ${Math.round(support.metrics.calibrationProgress * 100)}%`}
        </Text>
        {isRecording ? <Text style={styles.recordingText}>● RECORDING TEST</Text> : null}
        <Text style={styles.hudText}>knee {kneeCurrent}</Text>
      </View>
      <View style={styles.peakDisplayWrap} pointerEvents="none">
        <View style={styles.peakDisplay}>
          <Text style={styles.peakLabel}>PEAK FLEXION{peakLegText ? ` · ${peakLegText}` : ''}</Text>
          <Text style={styles.peakValue}>{peakAngleText}</Text>
        </View>
      </View>
      <View style={styles.hudActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset all movement metrics"
          onPress={() => {
            resetFlightTime();
            resetPeak();
            setSupportResetKey((key) => key + 1);
          }}
          style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
        >
          <Text style={styles.resetButtonText}>Reset all</Text>
        </Pressable>
      </View>
      <JumpTestOverlay
        state={jumpTest.state}
        stanceLeg={knee.stanceLeg}
        onStart={jumpTest.start}
        onCancel={jumpTest.cancel}
        onRestart={jumpTest.restart}
        onClose={jumpTest.cancel}
        hasFootage={videoUri !== null}
        onReview={() => setReviewVisible(true)}
      />
      <RecordingReview
        visible={reviewVisible}
        videoUri={videoUri}
        onClose={() => setReviewVisible(false)}
      />
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
  peakDisplayWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  peakDisplay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  peakLabel: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  peakValue: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 62,
  },
  recordingText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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

function formatContact(contact: boolean | null): string {
  return contact === null ? '?' : contact ? 'true' : 'false';
}
