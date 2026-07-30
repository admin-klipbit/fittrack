// Dashboard: today at a glance.

import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Btn, Card, Label, Screen, Sub } from '@/components/ui';
import { LineChart } from '@/components/line-chart';
import {
  activeWorkout, blockMeta, cardioStreakWeeks, getSetting, suggestedDay,
  latestProgressPhoto, thisWeekCounts, weighinsWithAvg,
} from '@/lib/db';
import { readReview } from '@/lib/mirror';
import { photoDay } from '@/lib/notifications';
import {
  DAY_NAMES, DEFAULT_CARDIO_PER_WEEK, DEFAULT_SESSIONS_PER_WEEK, TOTAL_WEEKS,
  blockInfo, programWeek, today,
} from '@/lib/program';
import { C } from '@/lib/theme';

export default function Dashboard() {
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const week = programWeek();
  const { block, weekInBlock } = blockInfo(week);
  const meta = blockMeta(block);
  const active = activeWorkout();
  const nextDay = suggestedDay();
  const counts = thisWeekCounts();
  const sessionsTarget = Number(getSetting('sessions_target', String(DEFAULT_SESSIONS_PER_WEEK)));
  const cardioTarget = Number(getSetting('cardio_target', String(DEFAULT_CARDIO_PER_WEEK)));
  const weights = weighinsWithAvg().slice(-30);
  const review = readReview();
  const snippet = review?.text
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))[0];
  const isPhotoDay = new Date().getDay() === photoDay();
  const photoDoneToday = latestProgressPhoto('front')?.date === today();
  const reviewBlock = weekInBlock === 8 ? block : block > 1 && weekInBlock === 1 ? block - 1 : 0;

  return (
    <Screen
      title="FitTrack"
      right={
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <SymbolView name="gearshape.fill" tintColor={C.sub} size={22} />
        </Pressable>
      }
    >
      <Card>
        <Sub>Block {block} · {meta.name}</Sub>
        <Label style={{ fontSize: 20 }}>
          Week {weekInBlock} of 8 <Text style={{ color: C.sub }}>· week {Math.min(week, TOTAL_WEEKS)}/{TOTAL_WEEKS}</Text>
        </Label>
        {!!meta.focus && <Sub>{meta.focus}</Sub>}
      </Card>

      {reviewBlock > 0 && (
        <Card style={{ borderColor: C.accent }}>
          <Label>Block {reviewBlock} boundary 🏁</Label>
          <Sub>Review the block and set the next focus.</Sub>
          <Btn title="Open block review" onPress={() => router.push(`/block/review?block=${reviewBlock}`)} />
        </Card>
      )}

      {active ? (
        <Card style={{ borderColor: C.accent }}>
          <Label>Workout in progress — Day {active.day}</Label>
          <Btn title="Resume workout" onPress={() => router.push('/workout/active')} />
        </Card>
      ) : (
        <Card>
          <Sub>Next up</Sub>
          <Label style={{ fontSize: 18 }}>Day {nextDay} — {DAY_NAMES[nextDay]}</Label>
          <Sub>{counts.workouts}/{sessionsTarget} sessions this week</Sub>
          <Btn title="Start workout" onPress={() => router.push(`/workout/active?day=${nextDay}`)} />
        </Card>
      )}

      {isPhotoDay && !photoDoneToday && (
        <Card style={{ borderColor: C.accent }}>
          <Label>Photo day 📸</Label>
          <Sub>Front, side, back — same spot, same pose.</Sub>
          <Btn title="Take progress photos" onPress={() => router.push('/photos/capture?angle=front&chain=1')} />
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Sub>Cardio</Sub>
          <Label style={{ fontSize: 20 }}>{counts.cardio}/{cardioTarget}</Label>
          <Sub>streak {cardioStreakWeeks(cardioTarget)}w 🔥</Sub>
        </Card>
        <Card style={{ flex: 1 }}>
          <Sub>Weight (7d avg)</Sub>
          <Label style={{ fontSize: 20 }}>
            {weights.length ? `${weights[weights.length - 1].avg.toFixed(1)}kg` : '—'}
          </Label>
          <LineChart mini height={36} points={weights.map((w) => ({ x: w.date, y: w.kg, avg: w.avg }))} />
        </Card>
      </View>

      <Pressable onPress={() => router.push('/coach')}>
        <Card>
          <Sub>Coach review</Sub>
          <Label numberOfLines={3} style={{ fontWeight: '400', fontSize: 14, lineHeight: 20 }}>
            {snippet ?? 'Your review appears here after each nightly check-in.'}
          </Label>
        </Card>
      </Pressable>
    </Screen>
  );
}
