import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { activeWorkout, initDb } from '@/lib/db';
import { initMirror, mirrorAll } from '@/lib/mirror';
import { syncCalendar } from '@/lib/calendar';
import { C } from '@/lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initMirror();
      initDb();
      mirrorAll();
      setReady(true);
      syncCalendar().catch(() => {});
      // Killed mid-workout? Drop straight back into the session.
      if (activeWorkout()) setTimeout(() => router.push('/workout/active'), 0);
    })();
  }, []);

  if (!ready) return null; // splash stays up

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/active" options={{ gestureEnabled: false }} />
        <Stack.Screen name="photos/capture" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cardio/log" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
