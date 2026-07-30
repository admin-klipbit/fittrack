// Auto-starting rest timer: in-app countdown + haptic, plus a local notification
// so it still fires when the phone is locked mid-rest.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C } from '@/lib/theme';
import { cancelNotification, scheduleRestNotification } from '@/lib/notifications';

export function RestTimer({ seconds, runId, onDone }: {
  seconds: number;
  runId: number; // increment to (re)start; 0 = idle
  onDone?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const notifId = useRef<string | null>(null);
  const endAt = useRef(0);

  useEffect(() => {
    if (!runId) return;
    endAt.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    (async () => {
      await cancelNotification(notifId.current);
      notifId.current = await scheduleRestNotification(seconds);
    })();
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(iv);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onDone?.();
      }
    }, 250);
    return () => {
      clearInterval(iv);
      cancelNotification(notifId.current);
      notifId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (!runId || remaining <= 0) return null;
  const frac = remaining / seconds;
  return (
    <Pressable style={s.wrap} onPress={() => { endAt.current = 0; setRemaining(0); cancelNotification(notifId.current); }}>
      <View style={[s.bar, { width: `${frac * 100}%` }]} />
      <Text style={s.text}>Rest {remaining}s — tap to skip</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    height: 44, borderRadius: 12, backgroundColor: C.card, overflow: 'hidden',
    justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.accentDim },
  text: { color: C.text, textAlign: 'center', fontWeight: '600' },
});
