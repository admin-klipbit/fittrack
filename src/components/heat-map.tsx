// 8-week activity heat map. marks: date -> 1 workout | 2 cardio | 3 both.

import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';
import { addDays, today } from '@/lib/program';

const COLORS: Record<number, string> = {
  0: C.bg, 1: C.accentDim, 2: '#2B6CB0', 3: C.accent,
};

export function HeatMap({ marks, weeks = 8 }: { marks: Record<string, number>; weeks?: number }) {
  const t = today();
  // Columns = weeks (oldest left), rows = weekday Mon..Sun.
  const monday = addDays(t, -(((new Date(t + 'T00:00:00').getDay() + 6) % 7)));
  const firstMonday = addDays(monday, -7 * (weeks - 1));
  return (
    <View style={s.wrap}>
      <View style={s.grid}>
        {Array.from({ length: weeks }, (_, w) => (
          <View key={w} style={s.col}>
            {Array.from({ length: 7 }, (_, d) => {
              const date = addDays(firstMonday, w * 7 + d);
              const future = date > t;
              return (
                <View
                  key={d}
                  style={[
                    s.cell,
                    { backgroundColor: future ? 'transparent' : COLORS[marks[date] ?? 0] },
                    !future && !marks[date] && { borderWidth: 1, borderColor: C.border },
                    date === t && { borderWidth: 1.5, borderColor: C.sub },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={s.legend}>
        {([['Lift', 1], ['Cardio', 2], ['Both', 3]] as const).map(([label, v]) => (
          <View key={label} style={s.legendItem}>
            <View style={[s.cell, { backgroundColor: COLORS[v] }]} />
            <Text style={s.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  grid: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  col: { gap: 4 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: C.sub, fontSize: 12 },
});
