import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MediapipeCamera,
  RunningMode,
  usePoseDetection,
  type DetectionError,
  type PoseDetectionResultBundle,
  type ViewCoordinator,
} from 'react-native-mediapipe';

import { PoseOverlay } from '@/components/PoseOverlay';
import { RailField } from '@/components/game/RailField';
import { RailHUD } from '@/components/game/RailHUD';
import { RailResultPanel } from '@/components/game/RailResultPanel';
import { StoryPanel } from '@/components/game/StoryPanel';
import type { RailRunSummary } from '@/game/types';
import { useRailRun } from '@/game/useRailRun';
import { useKneeAlignment } from '@/hooks/useKneeAlignment';
import type { PoseFrame } from '@/types/pose';

type Phase = { kind: 'intro' } | { kind: 'playing' } | { kind: 'result'; summary: RailRunSummary };

type Props = {
  onExit: () => void;
};

export function RailGrindScreen({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 33);
    return () => clearInterval(iv);
  }, []);

  const onResults = useCallback(
    (results: PoseDetectionResultBundle, coordinator: ViewCoordinator) => {
      const landmarks = results.results[0]?.landmarks?.[0];
      if (!landmarks) {
        setFrame(null);
        return;
      }
      const frameDims = coordinator.getFrameDims(results);
      const mapped = landmarks.map((lm) => {
        const p = coordinator.convertPoint(frameDims, { x: lm.x, y: lm.y });
        return { x: p.x, y: p.y, z: lm.z, visibility: lm.visibility ?? 1 };
      });
      setFrame({ landmarks: mapped, timestamp: Date.now() });
    },
    [],
  );

  const onError = useCallback((err: DetectionError) => {
    console.warn('[RailGrindScreen] pose error', err);
  }, []);

  const detector = usePoseDetection(
    { onResults, onError },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    { numPoses: 1, minPoseDetectionConfidence: 0.5 },
  );

  const { alignment, events, reset } = useKneeAlignment(frame);
  const { width, height } = detector.cameraViewDimensions;

  const handleComplete = useCallback((summary: RailRunSummary) => {
    setPhase({ kind: 'result', summary });
  }, []);

  const run = useRailRun({
    active: phase.kind === 'playing',
    state: alignment.state,
    events,
    onComplete: handleComplete,
  });

  const startRun = useCallback(() => {
    reset();
    setPhase({ kind: 'playing' });
  }, [reset]);

  const isWipeout = !!run && now < run.wipeoutUntil;

  return (
    <View style={styles.container}>
      <MediapipeCamera style={styles.camera} solution={detector} activeCamera="front" />
      <PoseOverlay frame={frame} width={width} height={height} />

      {phase.kind === 'playing' && run ? (
        <>
          <RailField alignment={alignment} run={run} width={width} height={height} now={now} />
          <RailHUD
            msRemaining={run.endsAt - now}
            score={run.score}
            multiplier={run.multiplier}
            alignment={alignment}
            isWipeout={isWipeout}
          />
        </>
      ) : null}

      {phase.kind === 'intro' ? (
        <StoryPanel
          eyebrow="RAIL GRIND PRO"
          title="Hold the Line"
          body="Jump up onto the rail and hold a single-leg squat as you grind down it. Keep your knee stacked over your ankle — if it caves inward, your avatar leans off the rail. Stay stacked to build your multiplier; a bad collapse wipes it out."
          primaryLabel="Drop in"
          onPrimary={startRun}
          secondaryLabel="Back to menu"
          onSecondary={onExit}
        />
      ) : null}

      {phase.kind === 'result' ? (
        <RailResultPanel summary={phase.summary} onPlayAgain={startRun} onExit={onExit} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
});
