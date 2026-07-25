import { forwardRef, useEffect } from 'react';
import { StyleProp, Text, ViewStyle } from 'react-native';
import {
  Camera,
  useCameraDevice,
  type CameraPosition,
} from 'react-native-vision-camera';
import type { MediaPipeSolution } from 'react-native-mediapipe';

type Props = {
  style: StyleProp<ViewStyle>;
  solution: MediaPipeSolution;
  activeCamera?: CameraPosition;
  isActive?: boolean;
};

// react-native-mediapipe's camera wrapper currently enables photo capture only.
// This equivalent keeps its coordinate/orientation wiring and enables video so
// the same frames can be recorded while MediaPipe continues processing them.
export const RecordableMediapipeCamera = forwardRef<Camera, Props>(
  (
    {
      style,
      solution: {
        cameraDeviceChangeHandler,
        cameraViewLayoutChangeHandler,
        cameraOrientationChangedHandler,
        resizeModeChangeHandler,
        frameProcessor,
      },
      activeCamera = 'front',
      isActive = true,
    },
    ref,
  ) => {
    const device = useCameraDevice(activeCamera);

    useEffect(() => {
      cameraDeviceChangeHandler(device);
    }, [cameraDeviceChangeHandler, device]);

    useEffect(() => {
      resizeModeChangeHandler('cover');
    }, [resizeModeChangeHandler]);

    if (!device) return <Text>Loading camera…</Text>;

    return (
      <Camera
        ref={ref}
        style={style}
        device={device}
        pixelFormat="rgb"
        isActive={isActive}
        frameProcessor={frameProcessor}
        onLayout={cameraViewLayoutChangeHandler}
        onOutputOrientationChanged={cameraOrientationChangedHandler}
        resizeMode="cover"
        video
        audio={false}
      />
    );
  },
);
