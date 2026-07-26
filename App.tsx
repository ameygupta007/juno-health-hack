import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { HomeScreen } from '@/components/HomeScreen';
import { PoseCamera } from '@/components/PoseCamera';
import { RailGrindScreen } from '@/components/game/RailGrindScreen';

type PermissionState = 'pending' | 'granted' | 'denied';
type Screen = 'home' | 'jump' | 'rail';

export default function App() {
  const [permission, setPermission] = useState<PermissionState>('pending');
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    (async () => {
      const current = Camera.getCameraPermissionStatus();
      const status =
        current === 'granted' ? 'granted' : await Camera.requestCameraPermission();
      setPermission(status === 'granted' ? 'granted' : 'denied');
    })();
  }, []);

  const goHome = () => setScreen('home');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {permission === 'granted' ? (
        screen === 'home' ? (
          <HomeScreen onSelect={setScreen} />
        ) : screen === 'jump' ? (
          <PoseCamera onExit={goHome} />
        ) : (
          <RailGrindScreen onExit={goHome} />
        )
      ) : (
        <View style={styles.message}>
          <Text style={styles.messageText}>
            {permission === 'pending'
              ? 'Requesting camera permission…'
              : 'Camera permission denied. Enable it in Settings to continue.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
