// Exercise detail (demo images + form cues + weight/rest editing) and
// custom-exercise creation (id === "new"): own photo or bundled library image.

import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Card, Label, Screen, Segmented, Stepper, Sub } from '@/components/ui';
import { addCustomExercise, getExercise, updateExercise } from '@/lib/db';
import { photoUri, savePhoto } from '@/lib/mirror';
import { EXERCISE_IMAGES } from '@/lib/exercise-images';
import { DAYS, Day, today } from '@/lib/program';
import { C } from '@/lib/theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id === 'new' ? <NewExercise /> : <ExerciseDetail id={id!} />;
}

function ExerciseDetail({ id }: { id: string }) {
  const [e, setE] = useState(() => getExercise(id));
  if (!e) return null;
  const imgs = e.lib_id ? EXERCISE_IMAGES[e.lib_id] : null;
  const cues: string[] = JSON.parse(e.cues || '[]');

  const set = (fields: Parameters<typeof updateExercise>[1]) => {
    updateExercise(e.id, fields);
    setE(getExercise(id));
  };

  const attachPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    const rel = savePhoto(res.assets[0].uri, `photos/exercises/${e.id}_${today()}.jpg`);
    set({ custom_photo: rel });
  };

  return (
    <Screen title={e.name} back>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {imgs ? (
          imgs.map((src, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Image source={src} style={s.big} contentFit="cover" />
              <Sub style={{ textAlign: 'center', marginTop: 4 }}>{i === 0 ? 'Start' : 'End'}</Sub>
            </View>
          ))
        ) : e.custom_photo ? (
          <Image source={photoUri(e.custom_photo)} style={[s.big, { flex: 1 }]} contentFit="cover" />
        ) : (
          <Card style={{ flex: 1, alignItems: 'center' }}><Sub>No demo image</Sub></Card>
        )}
      </View>

      {cues.length > 0 && (
        <Card>
          {cues.map((c, i) => (
            <Text key={i} style={s.cue}>•  {c}</Text>
          ))}
        </Card>
      )}

      <Card>
        <Sub>Plan: Day {e.day} · {e.sets}×{e.rep_high}{e.per_side ? '/side' : ''} · +{e.increment}kg on progression</Sub>
        <Stepper label={e.unit === 'placas' ? 'WORKING PLACAS' : 'WORKING WEIGHT'} value={e.weight}
          step={e.unit === 'placas' ? 1 : 0.5}
          onChange={(v) => set({ weight: v })}
          format={(v) => `${v}${e.unit === 'placas' ? ' pl' : 'kg'}`} />
        <Stepper label="REST (SECONDS)" value={e.rest_sec} step={15} min={15}
          onChange={(v) => set({ rest_sec: v })} format={(v) => `${v}s`} />
      </Card>

      <Btn kind="ghost" title="Attach my own photo" onPress={attachPhoto} />
      <Btn kind="ghost" title="Close" onPress={() => router.back()} />
    </Screen>
  );
}

function NewExercise() {
  const [name, setName] = useState('');
  const [day, setDay] = useState<Day>('A');
  const [sets, setSets] = useState(3);
  const [repHigh, setRepHigh] = useState(12);
  const [weight, setWeight] = useState(10);
  const [rest, setRest] = useState(60);
  const [perSide, setPerSide] = useState(false);
  const [libId, setLibId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null); // source uri until save

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]) {
      setPhoto(res.assets[0].uri);
      setLibId(null);
    }
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Give it a name');
      return;
    }
    const id = addCustomExercise({
      name: name.trim(), day, sets, repLow: Math.max(1, repHigh - 4), repHigh,
      weight, increment: 2, restSec: rest, perSide, libId, customPhoto: null,
    });
    if (photo) {
      const rel = savePhoto(photo, `photos/exercises/${id}.jpg`);
      updateExercise(id, { custom_photo: rel });
    }
    router.back();
  };

  return (
    <Screen title="New exercise" back>
      <Card>
        <TextInput style={s.input} placeholder="Exercise name" placeholderTextColor={C.sub}
          value={name} onChangeText={setName} />
        <Sub>Day</Sub>
        <Segmented options={DAYS} value={day} onChange={setDay} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stepper label="SETS" value={sets} step={1} min={1} onChange={setSets} />
          <Stepper label="TARGET REPS" value={repHigh} step={1} min={1} onChange={setRepHigh} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stepper label="WEIGHT" value={weight} step={1} onChange={setWeight} format={(v) => `${v}kg`} />
          <Stepper label="REST" value={rest} step={15} min={15} onChange={setRest} format={(v) => `${v}s`} />
        </View>
        <View style={s.switchRow}>
          <Sub>Per side (e.g. one-arm row)</Sub>
          <Switch value={perSide} onValueChange={setPerSide} trackColor={{ true: C.accent }} />
        </View>
      </Card>

      <Card>
        <Label>Demo image</Label>
        <Btn kind="ghost" title={photo ? 'Photo attached ✓ — change' : 'Use my own photo'} onPress={pickPhoto} />
        <Sub>…or pick from the bundled library:</Sub>
        <FlatList
          horizontal
          data={Object.keys(EXERCISE_IMAGES)}
          keyExtractor={(k) => k}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => { setLibId(item); setPhoto(null); }}>
              <Image
                source={EXERCISE_IMAGES[item][0]}
                style={[s.libThumb, libId === item && { borderColor: C.accent, borderWidth: 2 }]}
                contentFit="cover"
              />
            </Pressable>
          )}
        />
      </Card>

      <Btn title="Save exercise" onPress={save} />
    </Screen>
  );
}

const s = StyleSheet.create({
  big: { width: '100%', height: 140, borderRadius: 12, backgroundColor: C.card },
  cue: { color: C.text, fontSize: 15, lineHeight: 24 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    color: C.text, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libThumb: { width: 84, height: 64, borderRadius: 8, marginRight: 8, backgroundColor: C.bg },
});
