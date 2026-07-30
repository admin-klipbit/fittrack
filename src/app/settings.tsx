// Settings: calendar sync, reminders, weekly targets, block names, export, iCloud status.

import { useState } from 'react';
import { Alert, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { Btn, Card, Label, Screen, Segmented, Stepper, Sub } from '@/components/ui';
import { blockMeta, getSetting, setSetting } from '@/lib/db';
import {
  calendarEnabled, disableCalendarSync, enableCalendarSync, planConfig, syncCalendar,
} from '@/lib/calendar';
import { DAY_LABELS, photoDay, setWeeklyReminders } from '@/lib/notifications';
import { isICloud, mirrorRootUri, writeExportFile } from '@/lib/mirror';
import {
  DEFAULT_CARDIO_PER_WEEK, DEFAULT_SESSIONS_PER_WEEK, PROGRAM_START,
} from '@/lib/program';
import { C } from '@/lib/theme';

export default function Settings() {
  const [calOn, setCalOn] = useState(calendarEnabled());
  const [remOn, setRemOn] = useState(getSetting('reminders', '0') === '1');
  const [pDay, setPDay] = useState(photoDay());
  const cfg = planConfig();
  const [workoutTime, setWorkoutTime] = useState(cfg.workoutTime);
  const [cardioTime, setCardioTime] = useState(cfg.cardioTime);
  const [sessions, setSessions] = useState(Number(getSetting('sessions_target', String(DEFAULT_SESSIONS_PER_WEEK))));
  const [cardio, setCardio] = useState(Number(getSetting('cardio_target', String(DEFAULT_CARDIO_PER_WEEK))));
  const [blocks, setBlocks] = useState(() => [1, 2, 3, 4].map((b) => ({ b, ...blockMeta(b) })));

  const toggleCal = async (on: boolean) => {
    if (on) {
      const ok = await enableCalendarSync();
      if (!ok) Alert.alert('Calendar permission denied', 'Enable it in iOS Settings → FitTrack.');
      setCalOn(ok);
    } else {
      await disableCalendarSync();
      setCalOn(false);
    }
  };

  const toggleRem = async (on: boolean) => {
    setRemOn(on);
    setSetting('reminders', on ? '1' : '0');
    await setWeeklyReminders(on);
  };

  const saveTimes = async () => {
    if (!/^\d{2}:\d{2}$/.test(workoutTime) || !/^\d{2}:\d{2}$/.test(cardioTime)) {
      Alert.alert('Times must be HH:MM');
      return;
    }
    setSetting('workout_time', workoutTime);
    setSetting('cardio_time', cardioTime);
    if (calOn) await syncCalendar();
    Alert.alert('Saved');
  };

  const exportData = async () => {
    const uri = writeExportFile();
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const [checking, setChecking] = useState(false);
  const checkUpdates = async () => {
    setChecking(true);
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert('Update downloaded', 'Restart to apply it now?', [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert('Up to date ✓');
      }
    } catch (e: any) {
      Alert.alert('Update check failed', String(e?.message ?? e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen title="Settings" back>
      <Card>
        <View style={s.row}>
          <Label>Calendar sync</Label>
          <Switch value={calOn} onValueChange={toggleCal} trackColor={{ true: C.accent }} />
        </View>
        <Sub>Creates a “FitTrack” calendar. Completing a workout marks the event ✅; unfinished events roll forward.</Sub>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Sub>Workout time</Sub>
            <TextInput style={s.input} value={workoutTime} onChangeText={setWorkoutTime} placeholder="07:00" placeholderTextColor={C.sub} />
          </View>
          <View style={{ flex: 1 }}>
            <Sub>Cardio time</Sub>
            <TextInput style={s.input} value={cardioTime} onChangeText={setCardioTime} placeholder="18:00" placeholderTextColor={C.sub} />
          </View>
        </View>
        <Btn kind="ghost" title="Save times" onPress={saveTimes} />
      </Card>

      <Card>
        <View style={s.row}>
          <Label>Reminders</Label>
          <Switch value={remOn} onValueChange={toggleRem} trackColor={{ true: C.accent }} />
        </View>
        <Sub>Weigh-in Mon + Thu 08:00 · progress photos {DAY_LABELS[pDay]} 09:00.</Sub>
        <Sub>Photo day</Sub>
        <Segmented
          options={['1', '2', '3', '4', '5', '6', '0']}
          value={String(pDay)}
          onChange={async (v) => {
            setPDay(Number(v));
            setSetting('photo_day', v);
            if (remOn) await setWeeklyReminders(true); // reschedule on the new day
          }}
          labels={{ '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' }}
        />
      </Card>

      <Card>
        <Label>Weekly targets</Label>
        <Stepper label="LIFT SESSIONS / WEEK" value={sessions} step={1} min={1}
          onChange={(v) => { setSessions(v); setSetting('sessions_target', String(v)); }} />
        <Stepper label="CARDIO / WEEK" value={cardio} step={1} min={1}
          onChange={(v) => { setCardio(v); setSetting('cardio_target', String(v)); }} />
      </Card>

      <Card>
        <Label>Blocks (4 × 8 weeks)</Label>
        {blocks.map((blk, i) => (
          <View key={blk.b} style={{ gap: 4 }}>
            <Sub>Block {blk.b}</Sub>
            <TextInput
              style={s.input}
              value={blk.name}
              onChangeText={(t) => {
                setBlocks((xs) => xs.map((x, j) => (j === i ? { ...x, name: t } : x)));
                setSetting(`block_${blk.b}_name`, t);
              }}
            />
            <TextInput
              style={[s.input, { fontSize: 13 }]}
              value={blk.focus}
              onChangeText={(t) => {
                setBlocks((xs) => xs.map((x, j) => (j === i ? { ...x, focus: t } : x)));
                setSetting(`block_${blk.b}_focus`, t);
              }}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Label>Data</Label>
        <Sub>
          {isICloud()
            ? '☁️ Syncing to iCloud Drive → FitTrack. Your Mac reads it there.'
            : '⚠️ iCloud unavailable — storing locally (visible in Files app → On My iPhone → FitTrack). Use Export to share.'}
        </Sub>
        <Sub numberOfLines={2} style={{ fontSize: 11 }}>{mirrorRootUri()}</Sub>
        <Sub>Program start: {PROGRAM_START}</Sub>
        <Btn kind="ghost" title="Export data (JSON)" onPress={exportData} />
      </Card>

      <Card>
        <Label>App updates</Label>
        <Sub>
          {Updates.updateId
            ? `OTA update ${Updates.updateId.slice(0, 8)}${Updates.createdAt ? ` · ${Updates.createdAt.toLocaleString()}` : ''}`
            : 'Running the embedded bundle (no OTA update applied yet)'}
        </Sub>
        <Sub>channel: {Updates.channel ?? '—'} · runtime {Updates.runtimeVersion ?? '—'}</Sub>
        <Btn kind="ghost" title={checking ? 'Checking…' : 'Check for updates now'} onPress={checkUpdates} disabled={checking} />
      </Card>

      <Btn title="Done" onPress={() => router.back()} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    color: C.text, fontSize: 15, paddingHorizontal: 10, paddingVertical: 8,
  },
});
