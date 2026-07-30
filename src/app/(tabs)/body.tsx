// Body: weigh-ins with 7-day trend + weekly progress photo system.

import { useCallback, useState } from 'react';
import {
  Dimensions, FlatList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Btn, Card, Label, Screen, Sub } from '@/components/ui';
import { LineChart } from '@/components/line-chart';
import { addWeighin, progressPhotos, weighinsWithAvg } from '@/lib/db';
import { photoUri } from '@/lib/mirror';
import { programWeek, today } from '@/lib/program';
import { C } from '@/lib/theme';

const PAGE_W = Dimensions.get('window').width - 32 - 32; // screen - padding - card padding

export default function Body() {
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));
  const [kgInput, setKgInput] = useState('');

  const weights = weighinsWithAvg();
  const fronts = progressPhotos('front'); // cheap; recomputes on focus tick

  const save = () => {
    const kg = parseFloat(kgInput.replace(',', '.'));
    if (!kg || kg < 30 || kg > 250) return;
    addWeighin(today(), Math.round(kg * 10) / 10);
    setKgInput('');
    setTick((t) => t + 1);
  };

  return (
    <Screen title="Body">
      <Card>
        <Label>Weigh-in</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={s.input}
            placeholder="76.3"
            placeholderTextColor={C.sub}
            keyboardType="decimal-pad"
            value={kgInput}
            onChangeText={setKgInput}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Btn title="Save kg" onPress={save} style={{ paddingHorizontal: 20 }} />
        </View>
        <LineChart points={weights.slice(-90).map((w) => ({ x: w.date, y: w.kg, avg: w.avg }))} />
        <Sub>Thin line: daily · Green: 7-day average (the one that matters). Reminders Mon + Thu.</Sub>
      </Card>

      <Card>
        <Label>Progress photos</Label>
        {fronts.length ? (
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={[...fronts].reverse()}
            keyExtractor={(p) => p.date}
            snapToInterval={PAGE_W}
            renderItem={({ item }) => (
              <View style={{ width: PAGE_W }}>
                <Image source={photoUri(item.photo)} style={s.pagerImg} contentFit="cover" />
                <Sub style={{ textAlign: 'center', marginTop: 6 }}>
                  Week {programWeek(item.date)} · {item.date}{item.kg ? ` · ${item.kg}kg` : ''}
                </Sub>
              </View>
            )}
          />
        ) : (
          <Sub>No photos yet. Import your baseline (Week 0) or capture the first set.</Sub>
        )}
        <Btn title="📸 Capture front / side / back" onPress={() => router.push('/photos/capture?angle=front&chain=1')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="ghost" style={{ flex: 1 }} title="Import photos" onPress={() => router.push('/photos/import')} />
          <Btn kind="ghost" style={{ flex: 1 }} title="Compare weeks" onPress={() => router.push('/photos/compare')} />
        </View>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 22, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10,
  },
  pagerImg: { width: PAGE_W, height: PAGE_W * 1.25, borderRadius: 12, backgroundColor: C.bg },
});
