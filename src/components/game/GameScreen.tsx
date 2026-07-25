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
import { HUD } from '@/components/game/HUD';
import { StarField } from '@/components/game/StarField';
import { StoryPanel } from '@/components/game/StoryPanel';
import { useStarRound } from '@/game/useStarRound';
import { CHAPTERS, EPILOGUE } from '@/game/story';
import type { Phase } from '@/game/types';
import { useBalanceMetrics } from '@/hooks/useBalanceMetrics';
import type { PoseFrame } from '@/types/pose';

export function GameScreen() {
  const [phase, setPhase] = useState<Phase>({ kind: 'menu' });
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks state clock at ~30Hz so time-driven visuals (star pulse, timer)
  // stay smooth even between pose frames.
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
    console.warn('[GameScreen] pose error', err);
  }, []);

  const detector = usePoseDetection(
    { onResults, onError },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    { numPoses: 1, minPoseDetectionConfidence: 0.5 },
  );

  const balance = useBalanceMetrics(frame);
  const { width, height } = detector.cameraViewDimensions;

  const handleRoundComplete = useCallback(
    (caught: number, bonuses: number) => {
      if (phase.kind !== 'playing') return;
      setPhase({ kind: 'result', chapterIndex: phase.chapterIndex, caught, bonuses });
    },
    [phase],
  );

  const round = useStarRound({
    chapterIndex: phase.kind === 'playing' ? phase.chapterIndex : -1,
    frame,
    balance,
    viewWidth: width,
    viewHeight: height,
    onComplete: handleRoundComplete,
  });

  const activeChapter =
    phase.kind === 'playing' || phase.kind === 'intro' || phase.kind === 'result'
      ? CHAPTERS[phase.chapterIndex]
      : null;

  return (
    <View style={styles.container}>
      <MediapipeCamera style={styles.camera} solution={detector} activeCamera="front" />
      <PoseOverlay frame={frame} width={width} height={height} balance={balance} />

      {phase.kind === 'playing' && round && activeChapter ? (
        <>
          <StarField
            stars={round.stars}
            width={width}
            height={height}
            frame={frame}
            now={now}
          />
          <HUD
            chapterTitle={activeChapter.title}
            chapterSubtitle={activeChapter.subtitle}
            msRemaining={round.endsAt - now}
            caught={round.caught}
            target={activeChapter.targetStars}
            bonuses={round.bonuses}
            balance={balance}
          />
        </>
      ) : null}

      {phase.kind === 'menu' ? (
        <StoryPanel
          eyebrow="STARFALL"
          title="The Sky-Weaver's Journey"
          body="The village of Nirin has fallen dark. The seven great Constellations have scattered across the heavens. Reach for the stars — gather their light with your hands, stay balanced, and restore the sky one constellation at a time."
          primaryLabel="Begin"
          onPrimary={() => setPhase({ kind: 'intro', chapterIndex: 0 })}
        />
      ) : null}

      {phase.kind === 'intro' && activeChapter ? (
        <StoryPanel
          eyebrow={activeChapter.subtitle}
          title={activeChapter.title}
          body={activeChapter.intro}
          primaryLabel="I am ready"
          onPrimary={() =>
            setPhase({ kind: 'playing', chapterIndex: phase.chapterIndex })
          }
        />
      ) : null}

      {phase.kind === 'result' && activeChapter ? (
        <StoryPanel
          eyebrow={activeChapter.subtitle + ' · RESULT'}
          title={
            phase.caught >= activeChapter.targetStars
              ? 'Constellation restored'
              : 'The sky is not yet whole'
          }
          body={buildResultBody(phase.caught, activeChapter.targetStars, phase.bonuses)}
          primaryLabel={
            phase.chapterIndex + 1 < CHAPTERS.length ? 'Next constellation' : 'Complete the journey'
          }
          onPrimary={() => {
            if (phase.chapterIndex + 1 < CHAPTERS.length) {
              setPhase({ kind: 'intro', chapterIndex: phase.chapterIndex + 1 });
            } else {
              setPhase({ kind: 'epilogue' });
            }
          }}
          secondaryLabel="Try again"
          onSecondary={() =>
            setPhase({ kind: 'intro', chapterIndex: phase.chapterIndex })
          }
        />
      ) : null}

      {phase.kind === 'epilogue' ? (
        <StoryPanel
          eyebrow="EPILOGUE"
          title="The Sky is Whole"
          body={EPILOGUE}
          primaryLabel="Return home"
          onPrimary={() => setPhase({ kind: 'menu' })}
        />
      ) : null}
    </View>
  );
}

function buildResultBody(caught: number, target: number, bonuses: number): string {
  const pct = Math.round((caught / target) * 100);
  const bonusLine =
    bonuses > 0
      ? ` You held your center for ${bonuses} of them — the sky felt it.`
      : ' Try to hold your balance next time; the stars respond to a steady spirit.';
  if (caught >= target) {
    return `You gathered ${caught} stars — the constellation shines again above Nirin.${bonusLine}`;
  }
  return `You caught ${caught} of ${target} (${pct}%). Rest, breathe, and try once more.${bonusLine}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
});
