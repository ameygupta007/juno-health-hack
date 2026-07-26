import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import * as MailComposer from 'expo-mail-composer';

type Props = {
  visible: boolean;
  videoUri: string | null;
  onClose: () => void;
};

export function RecordingReview({ visible, videoUri, onClose }: Props) {
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);

  const sendByEmail = async () => {
    if (!videoUri || !isValidEmail(recipient)) {
      Alert.alert('Enter an email address', 'Choose a valid recipient before sending.');
      return;
    }

    if (!(await MailComposer.isAvailableAsync())) {
      Alert.alert(
        'Email unavailable',
        'Set up an email account on this device, then try again.',
      );
      return;
    }

    setSending(true);
    try {
      await MailComposer.composeAsync({
        recipients: [recipient.trim()],
        subject: 'Juno Health movement footage',
        body: 'Attached is the recorded Juno Health movement session.',
        attachments: [videoUri],
      });
    } catch (error) {
      console.warn('[RecordingReview] email composer error', error);
      Alert.alert('Could not create email', 'The MP4 could not be attached.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Review footage</Text>
        {videoUri ? (
          <Video
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            isLooping
          />
        ) : null}
        <TextInput
          accessibilityLabel="Recipient email address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setRecipient}
          placeholder="recipient@example.com"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={recipient}
        />
        <Pressable
          disabled={sending}
          onPress={sendByEmail}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            sending && styles.buttonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#001014" />
          ) : (
            <Text style={styles.primaryButtonText}>Email MP4</Text>
          )}
        </Pressable>
        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back to camera</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050b0d',
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  video: {
    width: '100%',
    flex: 1,
    maxHeight: 520,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  input: {
    color: '#fff',
    backgroundColor: '#111827',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#67e8f9',
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#001014',
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
