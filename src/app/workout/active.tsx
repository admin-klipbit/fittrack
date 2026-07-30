// Real-time in-gym logging: prefilled steppers, one tap to confirm a set,
// auto rest timer, keep-awake, exact restore if the app is killed.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Btn, Card, Label, Stepper, Sub } from '@/components/ui';
import { RestTimer } from '@/components/rest-timer';
import {
  Exercise, activeWorkout, discardWorkout, exercisesForDay,
  finishWorkout, logSet, progression, saveWorkoutPos, setWorkoutNote, setsForWorkout, startWorkout, suggestedDay,
  unitLabel, unitShort, weightLabel,
} from '@/lib/db';
import { photoUri } from '@/lib/mirror';
import { EXERCISE_IMAGES } from '@/lib/exercise-images';
import { DAYS, DAY_NAMES, Day } from '@/lib/program';
import { C } from '@/lib/theme';

export default function ActiveWorkout() {
  useKeepAwake();
  const params = useLocalSearchParams<{ day?: string }>();
  const [workout] = useState(() =>
    activeWorkout() ?? startWorkout((params.day as Day) ?? suggestedDay()));
  const exs = useMemo(() => exercisesForDay(workout.day), [workout.day]);

  const [exIdx, setExIdx] = useState(Math.min(workout.cur_ex, Math.max(0, exs.length - 1)));
  const [setNo, setSetNo] = useState(workout.cur_set);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [restRun, setRestRun] = useState(0);
  const [note, setNote] = useState(workout.note ?? '');
  const restSec = useRef(90);
  const cur: Exercise | undefined = exs[exIdx];

  const prog = useMemo(() => (cur ? progression(cur, workout.id) : null), [cur?.id, workout.id]);

  useEffect(() => {
    if (!cur || !prog) return;
    // this session's last set of the exercise wins — keeps mid-workout weight
    // adjustments instead of resetting to last session / seed every set
    const mine = setsForWorkout(workout.id).filter((x) => x.exercise_id === cur.id);
    const last = mine[mine.length - 1];
    const prevSet = prog.prev[setNo - 1] ?? prog.prev[prog.prev.length - 1];
    setWeight(last?.weight ?? (prog.increase ? prog.weight : prevSet?.weight ?? prog.weight));
    setReps(last ? last.reps : prog.increase ? prog.targetReps : prevSet?.reps ?? cur.rep_high);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIdx, setNo]);

  const tapGuard = useRef(0);

  const move = (i: number, n: number) => {
    saveWorkoutPos(workout.id, i, n);
    setExIdx(i);
    setSetNo(n);
  };

  const countFor = (e: Exercise, all = setsForWorkout(workout.id)) =>
    all.filter((x) => x.exercise_id === e.id).length;

  const advance = (logged: boolean) => {
    if (!cur) return;
    // swallow accidental double-taps of the big Log button
    if (Date.now() - tapGuard.current < 600) return;
    tapGuard.current = Date.now();
    if (logged) {
      logSet(workout.id, cur.id, setNo, weight, reps);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      restSec.current = cur.rest_sec;
      setRestRun((r) => r + 1);
    }
    if (setNo < cur.sets) return move(exIdx, setNo + 1);
    // done (or skipped out of) this exercise — next one with sets left, wrapping so
    // out-of-order / alternated exercises are never lost
    const all = setsForWorkout(workout.id);
    for (let d = 1; d < exs.length; d++) {
      const i = (exIdx + d) % exs.length;
      if (countFor(exs[i], all) < exs[i].sets) return move(i, countFor(exs[i], all) + 1);
    }
    if (countFor(cur, all) < cur.sets) return requestFinish(); // only skipped sets remain
    return logged ? finish() : requestFinish();
  };

  const finish = () => {
    if (setsForWorkout(workout.id).length === 0) {
      discardWorkout(workout.id);
      router.dismissTo('/(tabs)');
      return;
    }
    setWorkoutNote(workout.id, note);
    finishWorkout(workout.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/workout/summary?id=${workout.id}`);
  };

  const confirmDiscard = () =>
    Alert.alert('Discard workout?', 'All sets from this session will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discardWorkout(workout.id); router.dismissTo('/(tabs)'); } },
    ]);

  // Finish button: confirm when there's still work left (auto-finish after the
  // real last set stays instant — that path calls finish() directly).
  const requestFinish = () => {
    const all = setsForWorkout(workout.id);
    const left = exs.reduce((n, e) => n + Math.max(0, e.sets - countFor(e, all)), 0);
    if (left <= 0) return finish();
    Alert.alert('Finish early?', `${left} set${left > 1 ? 's' : ''} still to go. Everything logged so far is saved.`, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish workout', style: 'destructive', onPress: finish },
    ]);
  };

  if (!cur || !prog) return null;
  const imgs = cur.lib_id ? EXERCISE_IMAGES[cur.lib_id] : null;
  const allSets = setsForWorkout(workout.id);
  const doneSets = allSets.filter((s) => s.exercise_id === cur.id);
  const doneTotal = exs.reduce((n, e) => n + Math.min(countFor(e, allSets), e.sets), 0);
  const setTotal = exs.reduce((n, e) => n + e.sets, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <View style={s.top}>
          <View>
            <Sub>Day {workout.day} · {DAY_NAMES[workout.day]}</Sub>
            <Label style={{ fontSize: 22 }}>{cur.name}</Label>
            <Sub>Exercise {exIdx + 1}/{exs.length} · Set {setNo} of {cur.sets}{cur.per_side ? ' · per side' : ''}</Sub>
          </View>
          <Pressable onPress={confirmDiscard} hitSlop={10}>
            <Text style={{ color: C.danger, fontSize: 13 }}>Discard</Text>
          </Pressable>
        </View>

        {prog.increase && (
          <View style={s.badge}>
            <Text style={s.badgeText}>⬆ Increase weight — {prog.weight}{unitLabel(cur.unit)}, target {prog.targetReps} reps</Text>
          </View>
        )}

        <Pressable onPress={() => router.push(`/exercise/${cur.id}`)}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {imgs ? (
              imgs.map((src, i) => <Image key={i} source={src} style={s.demo} contentFit="cover" />)
            ) : cur.custom_photo ? (
              <Image source={photoUri(cur.custom_photo)} style={s.demo} contentFit="cover" />
            ) : (
              <View style={[s.demo, { alignItems: 'center', justifyContent: 'center' }]}>
                <Sub>form cues →</Sub>
              </View>
            )}
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stepper label={weightLabel(cur.unit)} value={weight} step={1} onChange={setWeight}
            format={(v) => `${v}${unitShort(cur.unit)}`} />
          <Stepper label="REPS" value={reps} step={1} min={1} onChange={setReps} />
        </View>

        <Btn title={`✓  Log set — ${weight}${unitLabel(cur.unit)} × ${reps}`} onPress={() => advance(true)}
          style={{ paddingVertical: 20 }} />

        <RestTimer seconds={restSec.current} runId={restRun} />

        <Card>
          <Label>Notes</Label>
          <TextInput
            style={s.note} multiline placeholder="Anything to remember — pain, form, ideas…"
            placeholderTextColor={C.sub} value={note} onChangeText={setNote}
            onEndEditing={() => setWorkoutNote(workout.id, note)} />
        </Card>

        {doneSets.length > 0 && (
          <Card style={{ paddingVertical: 10 }}>
            {doneSets.map((d) => (
              <Sub key={d.id}>Set {d.set_no}: {d.weight}{unitShort(cur.unit)} × {d.reps} ✓</Sub>
            ))}
          </Card>
        )}

        {/* Day plan: progress overview + tap any exercise to jump (alternate/superset) */}
        <Card style={{ gap: 0, paddingVertical: 10 }}>
          <View style={[s.planRow, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Label>Today's plan</Label>
            <Sub>{doneTotal}/{setTotal} sets</Sub>
          </View>
          {exs.map((e, i) => {
            const n = countFor(e, allSets);
            const complete = n >= e.sets;
            return (
              <Pressable
                key={e.id}
                onPress={() => i !== exIdx && move(i, Math.min(n + 1, e.sets))}
                style={({ pressed }) => [s.planRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={[s.planName, complete && { color: C.sub }, i === exIdx && { color: C.accent }]}>
                  {complete ? '✓  ' : ''}{e.name}{i === exIdx ? '  ●' : ''}
                </Text>
                <Sub style={i === exIdx ? { color: C.accent } : !complete && n > 0 ? { color: C.text } : undefined}>
                  {n}/{e.sets}
                </Sub>
              </Pressable>
            );
          })}
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="ghost" style={{ flex: 1 }} title="Skip set" onPress={() => advance(false)} />
          <Btn kind="ghost" style={{ flex: 1 }} title="Finish workout" onPress={requestFinish} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  note: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    backgroundColor: C.accentDim, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.accent,
  },
  badgeText: { color: C.accent, fontWeight: '700', textAlign: 'center' },
  demo: {
    flex: 1, height: 110, borderRadius: 12, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
  },
  planRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, gap: 8,
  },
  planName: { color: C.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
