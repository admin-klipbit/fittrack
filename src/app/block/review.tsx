// Block boundary review: weight change, volume progression per lift, cardio
// consistency, before/after photos, and the next block's focus.

import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Btn, Card, Label, Screen, Sub } from '@/components/ui';
import {
  blockMeta, cardioBetween, db, getSetting, progressPhotos, setSetting,
  setsForWorkout, weighinsWithAvg, workoutsFinishedBetween,
} from '@/lib/db';
import { photoUri } from '@/lib/mirror';
import { DEFAULT_CARDIO_PER_WEEK, blockDates, WEEKS_PER_BLOCK } from '@/lib/program';
import { C } from '@/lib/theme';

export default function BlockReview() {
  const { block: blockParam } = useLocalSearchParams<{ block: string }>();
  const block = Math.min(4, Math.max(1, Number(blockParam) || 1));
  const meta = blockMeta(block);
  const { start, end } = blockDates(block);
  const [focus, setFocus] = useState(() =>
    block < 4 ? getSetting(`block_${block + 1}_focus`) : '');

  const stats = useMemo(() => {
    const w = weighinsWithAvg().filter((x) => x.date >= start && x.date <= end);
    const workouts = workoutsFinishedBetween(start, end);
    const cardio = cardioBetween(start, end);

    // volume per exercise: first vs last session in the block
    const perLift = new Map<string, { name: string; first: number; last: number }>();
    for (const wk of workouts) {
      const sets = setsForWorkout(wk.id);
      const byEx = new Map<string, number>();
      for (const s of sets) byEx.set(s.exercise_id, (byEx.get(s.exercise_id) ?? 0) + s.weight * s.reps);
      for (const [exId, vol] of byEx) {
        const name = db.getFirstSync<{ name: string }>('SELECT name FROM exercises WHERE id=?', [exId])?.name ?? exId;
        const cur = perLift.get(exId);
        if (!cur) perLift.set(exId, { name, first: vol, last: vol });
        else cur.last = vol;
      }
    }

    const fronts = progressPhotos('front').filter((p) => p.date >= start && p.date <= end);
    return {
      weightStart: w[0]?.avg, weightEnd: w[w.length - 1]?.avg,
      workoutsN: workouts.length, cardioN: cardio.length,
      perLift: [...perLift.values()],
      before: fronts[0], after: fronts[fronts.length - 1],
    };
  }, [block]);

  const saveFocus = () => {
    if (block < 4) setSetting(`block_${block + 1}_focus`, focus.trim());
    router.back();
  };

  const delta = stats.weightStart != null && stats.weightEnd != null
    ? stats.weightEnd - stats.weightStart : null;

  return (
    <Screen title={`Block ${block} · ${meta.name}`} back>
      <Sub>{start} → {end}</Sub>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Sub>Weight (7d avg)</Sub>
          <Label style={{ fontSize: 18 }}>
            {delta != null
              ? `${stats.weightStart!.toFixed(1)} → ${stats.weightEnd!.toFixed(1)}kg (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
              : '—'}
          </Label>
        </Card>
        <Card style={{ flex: 1 }}>
          <Sub>Sessions</Sub>
          <Label style={{ fontSize: 18 }}>{stats.workoutsN} lifts · {stats.cardioN} cardio</Label>
          <Sub>cardio target {DEFAULT_CARDIO_PER_WEEK}/wk × {WEEKS_PER_BLOCK}wk</Sub>
        </Card>
      </View>

      {(stats.before || stats.after) && (
        <Card>
          <Label>Before / after</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[stats.before, stats.after].map((p, i) =>
              p ? (
                <View key={i} style={{ flex: 1 }}>
                  <Image source={photoUri(p.photo)} style={s.photo} contentFit="cover" />
                  <Sub style={{ textAlign: 'center', marginTop: 4 }}>
                    {p.date}{p.kg ? ` · ${p.kg}kg` : ''}
                  </Sub>
                </View>
              ) : <View key={i} style={{ flex: 1 }} />,
            )}
          </View>
        </Card>
      )}

      <Card>
        <Label>Volume per lift (first → last session)</Label>
        {stats.perLift.length === 0 && <Sub>No workouts logged in this block yet.</Sub>}
        {stats.perLift.map((l) => {
          const pct = l.first > 0 ? ((l.last - l.first) / l.first) * 100 : 0;
          return (
            <View key={l.name} style={s.liftRow}>
              <Text style={s.liftName} numberOfLines={1}>{l.name}</Text>
              <Text style={[s.liftPct, { color: pct >= 0 ? C.accent : C.danger }]}>
                {Math.round(l.first)} → {Math.round(l.last)}kg ({pct >= 0 ? '+' : ''}{pct.toFixed(0)}%)
              </Text>
            </View>
          );
        })}
      </Card>

      {block < 4 && (
        <Card>
          <Label>Focus for Block {block + 1} · {blockMeta(block + 1).name}</Label>
          <TextInput
            style={s.input}
            value={focus}
            onChangeText={setFocus}
            placeholder="What matters most next block?"
            placeholderTextColor={C.sub}
            multiline
          />
        </Card>
      )}

      <Btn title={block < 4 ? 'Save & start next block' : 'Done — program complete 🏁'} onPress={saveFocus} />
    </Screen>
  );
}

const s = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 0.8, borderRadius: 12, backgroundColor: C.bg },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 8 },
  liftName: { color: C.text, flexShrink: 1 },
  liftPct: { fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 15, padding: 12, minHeight: 60,
  },
});
