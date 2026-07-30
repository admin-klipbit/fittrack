// Guided progress-photo capture with a ghost overlay of the most recent photo
// for the angle (captured or imported) so framing/pose stay identical week to week.
// chain=1 walks front → side → back.

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Btn, Sub } from '@/components/ui';
import { addProgressPhoto, latestProgressPhoto, latestWeighin } from '@/lib/db';
import { photoUri, savePhoto } from '@/lib/mirror';
import { today } from '@/lib/program';
import { C } from '@/lib/theme';

const ORDER = ['front', 'side', 'back'] as const;
type Angle = typeof ORDER[number];

export default function Capture() {
  const params = useLocalSearchParams<{ angle?: string; chain?: string }>();
  const chain = params.chain === '1';
  const [angle, setAngle] = useState<Angle>((params.angle as Angle) ?? 'front');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Ghost: most recent photo for this angle — this is what makes the timelapse smooth.
  const ghost = photoUri(latestProgressPhoto(angle)?.photo ?? null);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.center}>
        <Sub style={{ textAlign: 'center', marginBottom: 16 }}>Camera access is needed for progress photos.</Sub>
        <Btn title="Allow camera" onPress={requestPermission} />
        <Btn kind="ghost" title="Cancel" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </SafeAreaView>
    );
  }

  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Full quality, no downscaling — these frames become the timelapse video.
      const pic = await cam.current?.takePictureAsync({ quality: 1 });
      if (!pic) return;
      const rel = savePhoto(pic.uri, `photos/progress/${today()}_${angle}.jpg`);
      addProgressPhoto({ date: today(), angle, photo: rel, kg: latestWeighin()?.kg ?? null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      next();
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    const i = ORDER.indexOf(angle);
    if (chain && i < ORDER.length - 1) setAngle(ORDER[i + 1]);
    else router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />
      {ghost && (
        <Image source={ghost} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" pointerEvents="none" />
      )}
      <SafeAreaView style={s.overlay} pointerEvents="box-none">
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={s.topText}>Cancel</Text>
          </Pressable>
          <Text style={[s.topText, { fontWeight: '800', textTransform: 'uppercase' }]}>{angle}</Text>
          <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={12}>
            <Text style={s.topText}>Flip</Text>
          </Pressable>
        </View>
        <View style={s.bottomBar}>
          {chain && (
            <Pressable onPress={next} hitSlop={12}>
              <Text style={s.topText}>Skip</Text>
            </Pressable>
          )}
          <Pressable onPress={shoot} style={s.shutter}>
            {busy ? <ActivityIndicator color="#000" /> : <View style={s.shutterInner} />}
          </Pressable>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 32 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  topText: { color: '#fff', fontSize: 16, textShadowColor: '#000', textShadowRadius: 4 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingBottom: 24,
  },
  shutter: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: '#000' },
});
