// Train: start workouts (rolling A→B→C queue), edit the plan, log cardio.

import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Btn, Card, Label, Screen, Segmented, Sub } from '@/components/ui';
import { HeatMap } from '@/components/heat-map';
import {
  activeWorkout, cardioStreakWeeks, completedWorkoutCount, activityMarks,
  exercisesForDay, getSetting, listCardio, thisWeekCounts,
  unitShort,
} from '@/lib/db';
import { calendarEnabled, postponeNext } from '@/lib/calendar';
import { DAYS, DAY_NAMES, Day, addDays, today, DEFAULT_CARDIO_PER_WEEK } from '@/lib/program';
import { C } from '@/lib/theme';

export default function Train() {
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));
  const suggested = DAYS[completedWorkoutCount() % 3];
  const [day, setDay] = useState<Day>(suggested);
  const exs = exercisesForDay(day);
  const active = activeWorkout();
  const counts = thisWeekCounts();
  const cardioTarget = Number(getSetting('cardio_target', String(DEFAULT_CARDIO_PER_WEEK)));
  const recentCardio = listCardio(5);

  const postpone = async (type: 'workout' | 'cardio') => {
    if (!calendarEnabled()) {
      Alert.alert('Calendar sync is off', 'Nothing is ever missed anyway — the queue just rolls forward. Turn on calendar sync in Settings to move planned events.');
      return;
    }
    const moved = await postponeNext(type);
    Alert.alert(moved ? `Moved to ${moved} 👍` : 'No upcoming planned event found');
  };

  return (
    <Screen title="Train">
      <Card>
        <Sub>Rolling queue — next up: Day {suggested}. Nothing is ever “missed”.</Sub>
        <Segmented
          options={DAYS}
          value={day}
          onChange={setDay}
          labels={{ A: `A${suggested === 'A' ? ' ·' : ''}`, B: `B${suggested === 'B' ? ' ·' : ''}`, C: `C${suggested === 'C' ? ' ·' : ''}` }}
        />
        <Label>{DAY_NAMES[day]}</Label>
        {exs.map((e) => (
          <Pressable key={e.id} onPress={() => router.push(`/exercise/${e.id}`)} style={s.exRow}>
            <Text style={s.exName}>{e.name}</Text>
            <Text style={s.exMeta}>
              {e.sets}×{e.rep_high} @ {e.weight}{unitShort(e.unit)}
            </Text>
          </Pressable>
        ))}
        {active ? (
          <Btn title="Resume workout" onPress={() => router.push('/workout/active')} />
        ) : (
          <Btn title={`Start Day ${day}`} onPress={() => router.push(`/workout/active?day=${day}`)} />
        )}
        <Btn kind="ghost" title="+ Add exercise" onPress={() => router.push('/exercise/new')} />
        <Btn kind="ghost" title="Postpone next planned workout" onPress={() => postpone('workout')} />
      </Card>

      <Card>
        <Label>Cardio — {counts.cardio}/{cardioTarget} this week · streak {cardioStreakWeeks(cardioTarget)}w 🔥</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn style={{ flex: 1 }} title="Log run 🏃" onPress={() => router.push('/cardio/log?type=run')} />
          <Btn style={{ flex: 1 }} title="Log swim 🏊" onPress={() => router.push('/cardio/log?type=swim')} />
        </View>
        <Btn kind="ghost" title="Postpone next planned cardio" onPress={() => postpone('cardio')} />
        {recentCardio.map((c) => (
          <View key={c.id} style={s.exRow}>
            <Text style={s.exName}>{c.type === 'run' ? '🏃 Run' : '🏊 Swim'} · {c.date}</Text>
            <Text style={s.exMeta}>
              {c.distance_km ? `${c.distance_km}km ` : ''}
              {c.meters ? `${c.meters}m ` : ''}
              {c.duration_min ? `${c.duration_min}min` : c.photo ? 'screenshot 📎' : ''}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Label>Last 8 weeks</Label>
        <HeatMap marks={activityMarks(addDays(today(), -56), today())} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  exName: { color: C.text, fontSize: 15, flexShrink: 1 },
  exMeta: { color: C.sub, fontSize: 13, marginLeft: 8 },
});
