import seedData from '@/data/sessions.seed.json';
import type { Patient, PatientSession, Readiness } from '@/data/types';

const patients = seedData as Patient[];

export function getPatients(): Patient[] {
  return patients;
}

export function getPatient(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

export function latestSession(patient: Patient): PatientSession {
  return patient.sessions[patient.sessions.length - 1];
}

export function firstSession(patient: Patient): PatientSession {
  return patient.sessions[0];
}

export function flightAsymmetryMs(session: PatientSession): number {
  return Math.abs(session.jump.leftFlightMs - session.jump.rightFlightMs);
}

export function flexionAsymmetryDeg(session: PatientSession): number {
  return Math.abs(session.jump.leftPeakFlexionDeg - session.jump.rightPeakFlexionDeg);
}

// Return-to-sport convention: asymmetry under 10% of the healthy-leg value is "restored".
const SYMMETRY_THRESHOLD_RATIO = 0.1;

export function symmetryThresholdMs(session: PatientSession): number {
  return Math.max(session.jump.leftFlightMs, session.jump.rightFlightMs) * SYMMETRY_THRESHOLD_RATIO;
}

export function readiness(patient: Patient): Readiness {
  const latest = latestSession(patient);
  const first = firstSession(patient);
  const latestAsymmetry = flightAsymmetryMs(latest);
  const withinThreshold = latestAsymmetry <= symmetryThresholdMs(latest);
  const recentValgusEvents = patient.sessions
    .slice(-3)
    .reduce((sum, s) => sum + s.rail.eventCount, 0);

  if (withinThreshold && recentValgusEvents <= 1) return 'improving';

  const improvedSinceStart = latestAsymmetry < flightAsymmetryMs(first) * 0.7;
  if (!improvedSinceStart || recentValgusEvents >= 6) return 'flagged';

  return 'steady';
}

export function readinessLabel(readiness: Readiness): string {
  switch (readiness) {
    case 'improving':
      return 'Improving';
    case 'flagged':
      return 'Flagged';
    case 'steady':
      return 'Steady';
  }
}
