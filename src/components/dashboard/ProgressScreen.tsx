import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PatientCard } from '@/components/dashboard/PatientCard';
import { PatientDetailScreen } from '@/components/dashboard/PatientDetailScreen';
import { getPatients } from '@/data/patients';

type Props = {
  onExit: () => void;
};

export function ProgressScreen({ onExit }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const patients = getPatients();

  if (selectedId) {
    const patient = patients.find((p) => p.id === selectedId);
    if (patient) {
      return <PatientDetailScreen patient={patient} onBack={() => setSelectedId(null)} />;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Back to home">
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.eyebrow}>CLINICIAN VIEW</Text>
        <Text style={styles.title}>Patient progress</Text>
        <Text style={styles.subtitle}>{patients.length} active patients</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {patients.map((patient) => (
          <PatientCard key={patient.id} patient={patient} onPress={() => setSelectedId(patient.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030714',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  back: {
    color: '#7c8aa5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  eyebrow: {
    color: '#7c8aa5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
});
