// Import progress photos from the library. Angle is set per photo (picking
// exactly 3 auto-assigns front/side/back in order). Date comes from EXIF,
// manual override only when missing. Pre-app baselines become Week 0.

import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Btn, Card, Label, Screen, Segmented, Sub } from '@/components/ui';
import { addProgressPhoto, weighins } from '@/lib/db';
import { savePhoto } from '@/lib/mirror';
import { C } from '@/lib/theme';
import { today } from '@/lib/program';

type Angle = 'front' | 'side' | 'back';
const ANGLES: Angle[] = ['front', 'side', 'back'];
type Item = { uri: string; date: string; fromExif: boolean; angle: Angle };

function exifDate(exif: any): string | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  const m = typeof raw === 'string' ? raw.match(/^(\d{4}):(\d{2}):(\d{2})/) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export default function ImportPhotos() {
  const [items, setItems] = useState<Item[]>([]);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 1, exif: true, allowsMultipleSelection: true,
    });
    if (res.canceled) return;
    setItems(res.assets.map((a, i) => {
      const d = exifDate(a.exif);
      return {
        uri: a.uri,
        date: d ?? today(),
        fromExif: !!d,
        // picking exactly 3 = today's ritual → front/side/back in pick order
        angle: res.assets.length === 3 ? ANGLES[i] : 'front',
      };
    }));
  };

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const save = () => {
    if (items.some((i) => !/^\d{4}-\d{2}-\d{2}$/.test(i.date))) {
      Alert.alert('Fix dates first', 'Every photo needs a YYYY-MM-DD date.');
      return;
    }
    // One photo per angle per date — catch collisions instead of silently overwriting.
    const slots = items.map((i) => `${i.date}_${i.angle}`);
    if (new Set(slots).size !== slots.length) {
      Alert.alert(
        'Duplicate angle',
        'Two photos have the same date and angle — change the angle on one of them (front / side / back).',
      );
      return;
    }
    const scale = weighins();
    for (const i of items) {
      const rel = savePhoto(i.uri, `photos/progress/${i.date}_${i.angle}.jpg`);
      // closest weigh-in within 3 days, if any
      const near = scale
        .map((w) => ({ w, d: Math.abs(new Date(w.date).getTime() - new Date(i.date).getTime()) }))
        .filter((x) => x.d <= 3 * 86400000)
        .sort((a, b) => a.d - b.d)[0]?.w;
      addProgressPhoto({ date: i.date, angle: i.angle, photo: rel, kg: near?.kg ?? null });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const n = items.length;
    setItems([]);
    Alert.alert(`Imported ${n} photo${n > 1 ? 's' : ''} ✓`, undefined, [
      { text: 'Done', onPress: () => router.back() },
      { text: 'Import more', style: 'cancel', onPress: pick },
    ]);
  };

  return (
    <Screen title="Import photos" back>
      <Card>
        <Sub>
          Pick your photos, then set each one's angle below. Picking exactly 3 auto-assigns
          front / side / back in order. Dates are read from EXIF automatically.
        </Sub>
        <Btn title={items.length ? 'Pick different photos' : 'Pick from library'} onPress={pick} />
      </Card>

      {items.map((item, idx) => (
        <Card key={item.uri} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Image source={item.uri} style={s.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 6 }}>
            <Segmented options={ANGLES} value={item.angle} onChange={(a) => setItem(idx, { angle: a })} />
            {item.fromExif ? (
              <Sub>{item.date} · from EXIF ✓</Sub>
            ) : (
              <>
                <Sub>No EXIF date — enter manually:</Sub>
                <TextInput
                  style={s.input}
                  value={item.date}
                  onChangeText={(t) => setItem(idx, { date: t })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.sub}
                />
              </>
            )}
          </View>
        </Card>
      ))}

      {items.length > 0 && (
        <Btn title={`Save ${items.length} photo${items.length > 1 ? 's' : ''}`} onPress={save} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  thumb: { width: 64, height: 80, borderRadius: 8, backgroundColor: C.bg },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    color: C.text, fontSize: 15, paddingHorizontal: 10, paddingVertical: 8,
  },
});
