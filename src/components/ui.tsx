// Small shared UI kit: screen wrapper, cards, buttons, steppers, segmented control.

import { ReactNode } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C } from '@/lib/theme';

export function Screen({ title, children, scroll = true, right, back = false }: {
  title: string; children: ReactNode; scroll?: boolean; right?: ReactNode; back?: boolean;
}) {
  const showBack = back && router.canGoBack();
  const body = (
    <>
      {showBack && (
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </Pressable>
      )}
      <View style={s.header}>
        <Text style={s.h1}>{title}</Text>
        {right}
      </View>
      {children}
    </>
  );
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.scrollBody} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[s.scrollBody, { flex: 1 }]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children, style, numberOfLines }: {
  children: ReactNode; style?: TextStyle; numberOfLines?: number;
}) {
  return <Text style={[s.label, style]} numberOfLines={numberOfLines}>{children}</Text>;
}
export function Sub({ children, style, numberOfLines }: {
  children: ReactNode; style?: TextStyle; numberOfLines?: number;
}) {
  return <Text style={[s.sub, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'primary', style, disabled }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && { backgroundColor: C.accent },
        kind === 'ghost' && { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
        kind === 'danger' && { backgroundColor: C.card, borderWidth: 1, borderColor: C.danger },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text style={[
        s.btnText,
        kind === 'primary' ? { color: '#04170A' } : { color: kind === 'danger' ? C.danger : C.text },
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Big one-thumb stepper for in-gym logging. */
export function Stepper({ label, value, step, min = 0, onChange, format }: {
  label: string; value: number; step: number; min?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const show = format ? format(value) : String(value);
  return (
    <View style={s.stepperWrap}>
      <Sub style={{ textAlign: 'center', marginBottom: 4 }}>{label}</Sub>
      <View style={s.stepperRow}>
        <Pressable
          style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.5 }]}
          onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
        >
          <Text style={s.stepBtnText}>−</Text>
        </Pressable>
        <Text style={s.stepValue} numberOfLines={1} adjustsFontSizeToFit>{show}</Text>
        <Pressable
          style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.5 }]}
          onPress={() => onChange(Math.round((value + step) * 100) / 100)}
        >
          <Text style={s.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, labels }: {
  options: T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>>;
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[s.segItem, o === value && { backgroundColor: C.accent }]}
        >
          <Text style={[s.segText, o === value && { color: '#04170A', fontWeight: '700' }]}>
            {labels?.[o] ?? o}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollBody: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 2 },
  backText: { color: C.accent, fontSize: 17, fontWeight: '600' },
  h1: { color: C.text, fontSize: 28, fontWeight: '800' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: C.border },
  label: { color: C.text, fontSize: 16, fontWeight: '600' },
  sub: { color: C.sub, fontSize: 13 },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  stepperWrap: { flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: C.accent, fontSize: 30, fontWeight: '700', lineHeight: 34 },
  stepValue: { flex: 1, color: C.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segText: { color: C.sub, fontSize: 14, fontWeight: '600' },
});
