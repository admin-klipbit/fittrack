import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { C } from '@/lib/theme';

const icon = (name: any) =>
  ({ color }: { color: unknown }) => <SymbolView name={name} tintColor={String(color)} size={24} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('house.fill') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: icon('dumbbell.fill') }} />
      <Tabs.Screen name="body" options={{ title: 'Body', tabBarIcon: icon('figure.stand') }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: icon('fork.knife') }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: icon('text.bubble.fill') }} />
    </Tabs>
  );
}
