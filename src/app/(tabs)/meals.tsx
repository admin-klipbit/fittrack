// Meal photo journal: photo + short description, day grid. No calorie counting —
// the nightly AI review does the analysis from photo + description.

import { useCallback, useState } from 'react';
import {
  Alert, SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Btn, Card, Label, Screen, Segmented, Sub } from '@/components/ui';
import { addMeal, mealsGrouped } from '@/lib/db';
import { photoUri, savePhoto } from '@/lib/mirror';
import { localISODate, today } from '@/lib/program';
import { C } from '@/lib/theme';

const TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof TYPES[number];

function exifDate(exif: any): { date: string; time: string } | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` } : null;
}

export default function Meals() {
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const [pending, setPending] = useState<{ uri: string | null; date: string; time: string } | null>(null);
  const [type, setType] = useState<MealType>('lunch');
  const [desc, setDesc] = useState('');
  const [dateOverride, setDateOverride] = useState('');
  const [timeOverride, setTimeOverride] = useState('');

  const nowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Plan B: forgot the photo — log a description-only meal, backdatable.
  const textOnly = () => {
    setPending({ uri: null, date: today(), time: nowTime() });
    setDateOverride(today());
    setTimeOverride(nowTime());
    setDesc('');
  };

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { quality: 1, exif: true };
    const res = camera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ['images'] });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const fallback = { date: today(), time: nowTime() };
    // Backdated import: date comes from EXIF automatically; manual override only if missing.
    const fromExif = camera ? null : exifDate(a.exif);
    setPending({ uri: a.uri, ...(fromExif ?? fallback) });
    setDateOverride(fromExif ? '' : fallback.date);
    setTimeOverride(fromExif ? '' : fallback.time);
    setDesc('');
  };

  const save = () => {
    if (!pending) return;
    const date = dateOverride || pending.date;
    const time = timeOverride || pending.time;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Date must be YYYY-MM-DD');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert('Time must be HH:MM (24h)');
      return;
    }
    if (!pending.uri && !desc.trim()) {
      Alert.alert('Describe the meal', 'Without a photo, the description is all the coach gets.');
      return;
    }
    const hhmm = time.replace(':', '');
    const rel = pending.uri ? savePhoto(pending.uri, `photos/meals/${date}_${type}_${hhmm}.jpg`) : '';
    addMeal({ date, time, type, photo: rel, description: desc.trim() || null });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPending(null);
    setTick((t) => t + 1);
  };

  const sections = mealsGrouped();

  return (
    <Screen title="Meals" scroll={false}>
      {pending ? (
        <Card>
          {pending.uri ? (
            <Image source={pending.uri} style={s.preview} contentFit="cover" />
          ) : (
            <Sub>📝 Text-only meal — no photo</Sub>
          )}
          <Segmented options={[...TYPES]} value={type} onChange={setType} />
          <TextInput
            style={s.input}
            placeholder="180g chicken, 150g rice, salad"
            placeholderTextColor={C.sub}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          {!!dateOverride && (
            <>
              <Sub>Logging late? Set when it was eaten:</Sub>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.input, { flex: 3 }]} value={dateOverride} onChangeText={setDateOverride}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.sub}
                  keyboardType="numbers-and-punctuation" autoCorrect={false} />
                <TextInput style={[s.input, { flex: 2 }]} value={timeOverride} onChangeText={setTimeOverride}
                  placeholder="HH:MM" placeholderTextColor={C.sub}
                  keyboardType="numbers-and-punctuation" autoCorrect={false} />
              </View>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn kind="ghost" style={{ flex: 1 }} title="Cancel" onPress={() => setPending(null)} />
            <Btn style={{ flex: 2 }} title="Save meal" onPress={save} />
          </View>
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn style={{ flex: 1 }} title="+ Camera" onPress={() => pick(true)} />
          <Btn kind="ghost" style={{ flex: 1 }} title="+ Library" onPress={() => pick(false)} />
          <Btn kind="ghost" style={{ flex: 1 }} title="+ Text" onPress={textOnly} />
        </View>
      )}

      <SectionList
        style={{ marginTop: 12 }}
        sections={sections}
        keyExtractor={(m) => String(m.id)}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Label style={{ marginTop: 10, marginBottom: 6 }}>
            {section.date === today() ? 'Today' : section.date}
          </Label>
        )}
        renderItem={({ item }) => (
          <View style={s.mealRow}>
            {item.photo ? (
              <Image source={photoUri(item.photo)} style={s.thumb} contentFit="cover" recyclingKey={item.photo} />
            ) : (
              <View style={[s.thumb, s.noPhoto]}>
                <Text style={{ fontSize: 28 }}>📝</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.mealTitle}>{item.type} · {item.time}</Text>
              {!!item.description && <Text style={s.mealDesc}>{item.description}</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={<Sub style={{ marginTop: 16 }}>Snap every meal — the nightly review reads photo + description.</Sub>}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: C.bg },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
  },
  mealRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  thumb: { width: 84, height: 84, borderRadius: 8, backgroundColor: C.bg },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  mealTitle: { color: C.text, fontWeight: '600', textTransform: 'capitalize' },
  mealDesc: { color: C.sub, fontSize: 13, marginTop: 2 },
});
