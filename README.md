# Juno Health

A consumer health app that uses on-device computer vision (MediaPipe Pose) to track body/limb movement in real time. Built with Expo + React Native.

## Stack

- **Expo (dev client)** — bare workflow-lite; we need native modules so managed Expo Go won't work
- **react-native-vision-camera** — camera frames
- **react-native-mediapipe** — MediaPipe Pose Landmarker (33 body landmarks)
- **react-native-worklets-core** + **react-native-reanimated** — required peer deps for the frame processor
- **react-native-svg** — draws the skeleton overlay

## First-time setup

```bash
npm install

# Download the MediaPipe pose model into ios/android asset dirs.
# The Lite model is ~5MB and enough for real-time on modern phones.
mkdir -p assets/models
curl -L -o assets/models/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task

# Generate the native ios/ and android/ folders
npx expo prebuild

# Bundle the .task model with the native app (place under ios/<AppName>/ and android/app/src/main/assets/)
cp assets/models/pose_landmarker_lite.task android/app/src/main/assets/
cp assets/models/pose_landmarker_lite.task "ios/JunoHealth/"
```

> The exact iOS asset path depends on your bundle name — check the folder created by `expo prebuild`. If you can't find it, drag the `.task` file into the Xcode project so it's added to the app bundle's Copy Bundle Resources phase.

## Run

```bash
# iOS (needs Xcode + a real device recommended for camera)
npm run ios

# Android
npm run android
```

Once running, the app requests camera permission and starts drawing a green skeleton over your body via the front camera.

## Project structure

```
App.tsx                       # permission gate + root
index.ts                      # Expo entry
src/
  components/
    PoseCamera.tsx            # camera + MediaPipe pose detector
    PoseOverlay.tsx           # SVG skeleton drawn from landmarks
  types/
    pose.ts                   # landmark indices + bone connections
```

## Where to build next

- `src/types/pose.ts` — the 33 landmark indices are named there (shoulders, elbows, wrists, hips, knees, ankles). Use them to compute joint angles, rep counts, posture cues, etc.
- Feed `PoseCamera`'s frames into a rules engine (e.g. "arm raised above shoulder", "squat depth") for whatever health interaction you build.
