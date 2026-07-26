import type { Landmark } from 'react-native-mediapipe';

// Re-export MediaPipe landmark constants and bone connections so the rest of the
// app has a single import for pose types + topology.
export {
  KnownPoseLandmarks as POSE_LANDMARKS,
  KnownPoseLandmarkConnections as POSE_CONNECTIONS,
} from 'react-native-mediapipe';

// A landmark projected into camera-view pixel coordinates, ready to render.
export type ScreenLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

// Raw MediaPipe landmark: x, y, z all in normalized image-width units. Kept
// alongside the projected pixel landmarks because 3D angle math needs
// consistent units across all axes (pixel-space y with normalized z is wrong).
export type NormalizedLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrame = {
  landmarks: ScreenLandmark[];
  normalizedLandmarks: NormalizedLandmark[];
  timestamp: number;
};

export type { Landmark };
