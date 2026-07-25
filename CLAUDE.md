# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Juno Health — a hackathon consumer health app built on Expo + React Native. The core capability is real-time on-device body/limb tracking via MediaPipe Pose Landmarker (33 landmarks). Product features layered on top will consume the landmark stream to score movement, count reps, cue posture, etc.

## Commands

```bash
npm install                    # install JS deps
npm run typecheck              # tsc --noEmit
npx expo prebuild              # generate ios/ and android/ (needed after any native config change)
npm run ios                    # build + run iOS dev client (real device recommended for camera)
npm run android                # build + run Android dev client
npm start                      # metro bundler for the dev client
```

There is no test runner configured yet.

## Runtime prerequisite: the pose model

The MediaPipe pose model is **not** in the repo — it must be fetched and bundled into the native app before pose detection will initialise. See README.md for the exact `curl` + copy commands. The native module throws `"Failed to initialize posedetection plugin"` at startup if it can't find `pose_landmarker_lite.task` in the app bundle.

## Architecture

This is an Expo **dev-client** project, not managed. MediaPipe requires native modules, so `expo prebuild` generates `ios/` and `android/` and neither Expo Go nor `expo start --web` will work.

Frame flow:

1. `react-native-vision-camera` produces frames on a worklet thread.
2. `react-native-mediapipe`'s `usePoseDetection` hook returns a `MediaPipeSolution` — an opaque bundle of handlers (`frameProcessor`, layout/device handlers) plus `cameraViewDimensions`.
3. `MediapipeCamera` accepts that solution as its `solution` prop and wires the frame processor into a `<Camera>`. It also owns the camera's layout, so `solution.cameraViewDimensions` is the source of truth for the view size — don't add your own `onLayout` wrapper for that.
4. Results arrive on the JS thread via the `onResults` callback with a `ViewCoordinator`. Landmark coordinates are normalised (0..1) in the source frame — always run them through `coordinator.convertPoint(coordinator.getFrameDims(results), lm)` to get camera-view pixel coordinates before rendering.
5. The projected landmarks are handed to `PoseOverlay`, which draws bones (from `POSE_CONNECTIONS`) and joints as SVG on top of the camera.

Key indirection: `src/types/pose.ts` re-exports `KnownPoseLandmarks` as `POSE_LANDMARKS` and `KnownPoseLandmarkConnections` as `POSE_CONNECTIONS`. Import pose topology from `@/types/pose`, not directly from `react-native-mediapipe`, so downstream code has one import path.

Path alias: `@/*` → `src/*` (configured in `tsconfig.json`).

## Gotchas

- **Babel plugin order matters.** `react-native-worklets-core/plugin` must precede `react-native-reanimated/plugin` in `babel.config.js`. Reordering silently breaks the frame processor.
- **After editing `app.json` plugins or adding native deps**, re-run `npx expo prebuild` and rebuild the native app — Metro reload alone won't pick up native changes.
- **Front camera is mirrored** by default on Android via the library's `mirror-front-only` mode; landmark coordinates from `convertPoint` already account for this, so don't double-flip in the overlay.
- **`Landmark.visibility` is optional** in the library's type. `PoseCamera` defaults missing values to `1`; the overlay filters by `MIN_VISIBILITY` (0.5) before drawing.
