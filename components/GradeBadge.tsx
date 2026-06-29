import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradeNum, gradeKind } from '@/lib/design/cardPresentation';

// Metallic gold grade badge (PSA-style) — ported from the mockup's .grade-badge.
export function GradeBadge({ grade, size = 36 }: { grade: string; size?: number }) {
  return (
    <LinearGradient
      colors={['#FBF3DF', '#ECD4A0', '#CBA968', '#A6824A']}
      locations={[0, 0.34, 0.62, 1]}
      start={{ x: 0.3, y: 0.15 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.num, { fontSize: size * 0.36 }]}>{gradeNum(grade)}</Text>
      <Text style={[styles.kind, { fontSize: Math.max(6, size * 0.17) }]}>{gradeKind(grade)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  num: { fontWeight: '800', color: '#5B4420', letterSpacing: -0.5 },
  kind: { fontWeight: '700', color: '#7A5E2E', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
});
