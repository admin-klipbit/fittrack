// Session summary: total volume, duration, PRs, next-time progression hints.

import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Label, Screen, Sub } from '@/components/ui';
import { getExercise, getWorkout, maxWeightBefore, progression, setsForWorkout } from '@/lib/db';
import { C } from '@/lib/theme';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = getWorkout(Number(id));
  const sets = useMemo(() => setsForWorkout(Number(id)), [id]);

  if (!workout) return null;

  const volume = sets.reduce((s, x) => s + x.weight * x.reps, 0);
  const durationMin = workout.finished_at
    ? Math.round((new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()) / 60000)
    : 0;

  const byExercise = [...new Set(sets.map((s) => s.exercise_id))].map((exId) => {
    const e = getExercise(exId);
    const mine = sets.filter((s) => s.exercise_id === exId);
    const best = Math.max(...mine.map((s) => s.weight));
    const isPR = best > maxWeightBefore(exId, workout.id) && best > 0;
    const next = e ? progression(e) : null; // now includes this session
    return { e, mine, best, isPR, next };
  });

  return (
    <Screen title="Session done 💪" back>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Sub>Volume</Sub>
          <Label style={{ fontSize: 22 }}>{Math.round(volume).toLocaleString()}kg</Label>
        </Card>
        <Card style={{ flex: 1 }}>
          <Sub>Duration</Sub>
          <Label style={{ fontSize: 22 }}>{durationMin}min</Label>
        </Card>
        <Card style={{ flex: 1 }}>
          <Sub>Sets</Sub>
          <Label style={{ fontSize: 22 }}>{sets.length}</Label>
        </Card>
      </View>

      {byExercise.map(({ e, mine, best, isPR, next }) => (
        <Card key={e?.id ?? Math.random()}>
          <Label>
            {e?.name ?? 'Exercise'} {isPR && <Text style={{ color: C.accent }}>· PR {best}{e?.unit === 'placas' ? ' pl' : 'kg'} 🎉</Text>}
          </Label>
          <Sub>{mine.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</Sub>
          {next?.increase && (
            <Sub style={{ color: C.accent }}>
              ⬆ Next time: {next.weight}{e?.unit === 'placas' ? ' placas' : 'kg'}, target {next.targetReps} reps
            </Sub>
          )}
        </Card>
      ))}

      <Btn title="Done" onPress={() => router.dismissTo('/(tabs)')} />
    </Screen>
  );
}
