// Side-by-side comparison of any two weeks, per angle.

import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Card, Label, Screen, Segmented, Sub } from '@/components/ui';
import { ProgressPhoto, progressPhotos } from '@/lib/db';
import { photoUri } from '@/lib/mirror';
import { programWeek } from '@/lib/program';
import { C } from '@/lib/theme';

type Angle = 'front' | 'side' | 'back';

export default function Compare() {
  const [angle, setAngle] = useState<Angle>('front');
  const photos = useMemo(() => progressPhotos(angle), [angle]);
  const [aIdx, setAIdx] = useState(0);
  const [bIdx, setBIdx] = useState(-1); // -1 = latest

  const a = photos[Math.min(aIdx, photos.length - 1)];
  const b = photos[bIdx === -1 ? photos.length - 1 : Math.min(bIdx, photos.length - 1)];

  return (
    <Screen title="Compare" back>
      <Segmented options={['front', 'side', 'back'] as Angle[]} value={angle}
        onChange={(v) => { setAngle(v); setAIdx(0); setBIdx(-1); }} />

      {photos.length < 2 ? (
        <Card><Sub>Need at least two {angle} photos to compare.</Sub></Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Shot p={a} />
            <Shot p={b} />
          </View>
          <Card>
            <Label>Left</Label>
            <WeekStrip photos={photos} selected={a} onPick={(i) => setAIdx(i)} />
            <Label style={{ marginTop: 8 }}>Right</Label>
            <WeekStrip photos={photos} selected={b} onPick={(i) => setBIdx(i)} />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Shot({ p }: { p?: ProgressPhoto }) {
  if (!p) return <View style={{ flex: 1 }} />;
  return (
    <View style={{ flex: 1 }}>
      <Image source={photoUri(p.photo)} style={s.img} contentFit="cover" />
      <Sub style={{ textAlign: 'center', marginTop: 4 }}>
        W{programWeek(p.date)} · {p.date}{p.kg ? ` · ${p.kg}kg` : ''}
      </Sub>
    </View>
  );
}

function WeekStrip({ photos, selected, onPick }: {
  photos: ProgressPhoto[]; selected?: ProgressPhoto; onPick: (i: number) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={photos}
      keyExtractor={(p) => p.date}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => onPick(index)}
          style={[s.chip, selected?.date === item.date && { backgroundColor: C.accent }]}>
          <Text style={[s.chipText, selected?.date === item.date && { color: '#04170A' }]}>
            W{programWeek(item.date)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  img: { width: '100%', aspectRatio: 0.8, borderRadius: 12, backgroundColor: C.card },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border, marginRight: 6,
  },
  chipText: { color: C.text, fontWeight: '700' },
});
