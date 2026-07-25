import { useCallback, useRef, useState } from 'react';
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
import { BALANCE_COLORS } from '@/lib/balance';
import type { NormalizedLandmark, PoseFrame } from '@/types/pose';

export function PoseCamera() {
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const cameraRef = useRef<Camera>(null);

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
  const { metrics: flightTime, reset: resetFlightTime } = useFlightTime(frame);
  const knee = useKneeFlexionMetrics(frame, resetKey, flightTime.phase === 'airborne');
  const resetPeak = useCallback(() => setResetKey((k) => k + 1), []);
  const jumpTest = useJumpTest({
    flightMetrics: flightTime,
    kneeMetrics: knee,
    onResetPeak: resetPeak,
  });
  const { width, height } = detector.cameraViewDimensions;

  const stanceLabel = knee.stanceLeg === null ? '—' : knee.stanceLeg.toUpperCase();
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
    setIsRecording(true);
    try {
      cameraRef.current.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: (video) => {
          const uri = video.path.startsWith('file://')
            ? video.path
            : `file://${video.path}`;
          setVideoUri(uri);
          setIsRecording(false);
          setIsSaving(false);
          setReviewVisible(true);
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

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording || isSaving) return;
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

  return (
    <View style={styles.container}>
      <RecordableMediapipeCamera
        ref={cameraRef}
        style={styles.camera}
        solution={detector}
        activeCamera="front"
        isActive={!reviewVisible}
      />
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
        <Text style={styles.hudText}>airborne {airborneLabel}</Text>
        <Text style={styles.hudText}>knee {kneeCurrent}</Text>
      </View>
      <View style={styles.peakDisplayWrap} pointerEvents="none">
        <View style={styles.peakDisplay}>
          <Text style={styles.peakLabel}>PEAK FLEXION{peakLegText ? ` · ${peakLegText}` : ''}</Text>
          <Text style={styles.peakValue}>{peakAngleText}</Text>
        </View>
      </View>
      <View style={styles.recordingActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          disabled={isSaving}
          onPress={isRecording ? stopRecording : startRecording}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.stopButton,
            pressed && styles.resetButtonPressed,
            isSaving && styles.disabledButton,
          ]}
        >
          <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
          <Text style={styles.resetButtonText}>
            {isSaving ? 'Saving…' : isRecording ? 'Stop' : 'Record'}
          </Text>
        </Pressable>
        {videoUri && !isRecording ? (
          <Pressable
            onPress={() => setReviewVisible(true)}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
          >
            <Text style={styles.resetButtonText}>Review</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.hudActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset all movement metrics"
          onPress={() => {
            resetFlightTime();
            resetPeak();
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
  recordingActions: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    flexDirection: 'row',
    gap: 8,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  stopButton: {
    backgroundColor: 'rgba(127,29,29,0.85)',
  },
  recordIcon: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  stopIcon: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  disabledButton: {
    opacity: 0.55,
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
