// Cardio logging. Runs: primary flow is attaching the Nike Run Club screenshot
// (the nightly review extracts distance/pace/duration from it) — manual fields optional.
// Swims: quick manual log.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Btn, Card, Label, Screen, Sub } from '@/components/ui';
import { addCardio } from '@/lib/db';
import { photoExists, savePhoto } from '@/lib/mirror';
import { today } from '@/lib/program';
import { C } from '@/lib/theme';

export default function CardioLog() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const isRun = type !== 'swim';
  const [shot, setShot] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [meters, setMeters] = useState('');
  const [rpe, setRpe] = useState('');
  const [note, setNote] = useState('');

  const pickShot = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]) setShot(res.assets[0].uri);
  };

  const save = () => {
    const date = today();
    let photo: string | null = null;
    if (shot) {
      let rel = `photos/cardio/${date}_${isRun ? 'run' : 'swim'}.jpg`;
      if (photoExists(rel)) {
        const now = new Date();
        rel = `photos/cardio/${date}_${isRun ? 'run' : 'swim'}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.jpg`;
      }
      photo = savePhoto(shot, rel);
    }
    addCardio({
      date,
      type: isRun ? 'run' : 'swim',
      duration_min: parseFloat(duration.replace(',', '.')) || null,
      distance_km: isRun ? parseFloat(distance.replace(',', '.')) || null : null,
      meters: !isRun ? parseInt(meters, 10) || null : null,
      rpe: parseInt(rpe, 10) || null,
      note: note.trim() || null,
      photo,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen title={isRun ? 'Log run 🏃' : 'Log swim 🏊'} back>
      {isRun && (
        <Card>
          <Label>Nike Run Club screenshot</Label>
          {shot ? (
            <Image source={shot} style={s.shot} contentFit="cover" />
          ) : (
            <Sub>Attach the screenshot — the nightly review extracts distance, pace and duration for you.</Sub>
          )}
          <Btn kind={shot ? 'ghost' : 'primary'} title={shot ? 'Change screenshot' : 'Attach screenshot'} onPress={pickShot} />
        </Card>
      )}

      <Card>
        <Label>{isRun ? 'Optional details' : 'Details'}</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={s.input} placeholder="Duration (min)" placeholderTextColor={C.sub}
            keyboardType="decimal-pad" value={duration} onChangeText={setDuration} />
          {isRun ? (
            <TextInput style={s.input} placeholder="Distance (km)" placeholderTextColor={C.sub}
              keyboardType="decimal-pad" value={distance} onChangeText={setDistance} />
          ) : (
            <TextInput style={s.input} placeholder="Laps (out + back = 1)" placeholderTextColor={C.sub}
              keyboardType="number-pad" value={meters} onChangeText={setMeters} />
          )}
        </View>
        {!isRun && (
          <TextInput style={s.input} placeholder="RPE 1–10 (optional)" placeholderTextColor={C.sub}
            keyboardType="number-pad" value={rpe} onChangeText={setRpe} />
        )}
        <TextInput style={s.input} placeholder="Note (optional)" placeholderTextColor={C.sub}
          value={note} onChangeText={setNote} />
      </Card>

      <Btn title="Save" onPress={save} />
      <Btn kind="ghost" title="Cancel" onPress={() => router.back()} />
    </Screen>
  );
}

const s = StyleSheet.create({
  shot: { width: '100%', height: 220, borderRadius: 12, backgroundColor: C.bg },
  input: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 12, minWidth: 120,
  },
});
