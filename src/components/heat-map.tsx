// 8-week activity heat map + current-week plan strip.
// marks: date -> 1 workout | 2 cardio | 3 both.

import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';
import { SWIM_PLAN_DAYS, WEEKDAY_PLAN } from '@/lib/db';
import { addDays, today } from '@/lib/program';

const COLORS: Record<number, string> = {
  0: C.bg, 1: C.accentDim, 2: '#2B6CB0', 3: C.accent,
};

/** Mon–Sun of the current week, real dates: planned day letter (C/A/B), swim dot,
 *  filled when done, today outlined. Skipped days just stay unfilled — no guilt. */
export function WeekStrip({ marks }: { marks: Record<string, number> }) {
  const t = today();
  const monday = addDays(t, -((new Date(t + 'T00:00:00').getDay() + 6) % 7));
  return (
    <View style={s.grid}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        const dow = new Date(date + 'T00:00:00').getDay();
        const plan = WEEKDAY_PLAN[dow];
        const m = marks[date] ?? 0;
        const lifted = (m & 1) !== 0;
        const swam = (m & 2) !== 0;
        const swimPlanned = SWIM_PLAN_DAYS.includes(dow);
        return (
          <View key={date} style={s.dayCol}>
            <Text style={s.dowText}>{'MTWTFSS'[i]}{date.slice(8)}</Text>
            <View style={[
              s.dayCell,
              lifted ? { backgroundColor: COLORS[1] } : { borderWidth: 1, borderColor: C.border },
              date === t && { borderWidth: 1.5, borderColor: C.sub },
            ]}>
              <Text style={[s.dayLetter, { color: lifted ? C.accent : plan ? C.text : C.sub }]}>
                {plan ?? '·'}
              </Text>
            </View>
            <Text style={[s.swim, { opacity: swam ? 1 : swimPlanned && date >= t ? 0.35 : 0 }]}>🏊</Text>
          </View>
        );
      })}
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Real calendar of the last `weeks` weeks: rows = weeks (oldest on top), columns =
 *  Mon–Sun, day-of-month in each cell, month labels in the left gutter. */
export function HeatMap({ marks, weeks = 8 }: { marks: Record<string, number>; weeks?: number }) {
  const t = today();
  const monday = addDays(t, -(((new Date(t + 'T00:00:00').getDay() + 6) % 7)));
  const firstMonday = addDays(monday, -7 * (weeks - 1));
  let prevMonth = -1;
  return (
    <View style={s.wrap}>
      <View style={s.calRow}>
        <Text style={s.gutter} />
        {Array.from({ length: 7 }, (_, d) => (
          <Text key={d} style={[s.calHead]}>{'MTWTFSS'[d]}</Text>
        ))}
      </View>
      {Array.from({ length: weeks }, (_, w) => {
        const rowMonday = addDays(firstMonday, w * 7);
        const month = new Date(rowMonday + 'T00:00:00').getMonth();
        const label = month !== prevMonth ? MONTHS[month] : '';
        prevMonth = month;
        return (
          <View key={w} style={s.calRow}>
            <Text style={s.gutter}>{label}</Text>
            {Array.from({ length: 7 }, (_, d) => {
              const date = addDays(rowMonday, d);
              const future = date > t;
              const m = future ? 0 : marks[date] ?? 0;
              return (
                <View
                  key={d}
                  style={[
                    s.calCell,
                    { backgroundColor: COLORS[m] === C.bg ? 'transparent' : COLORS[m] },
                    date === t && { borderWidth: 1.5, borderColor: C.sub },
                  ]}
                >
                  <Text style={[s.calDay, { color: m ? C.text : future ? C.border : C.sub }]}>
                    {Number(date.slice(8))}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
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
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dowText: { color: C.sub, fontSize: 11 },
  dayCell: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayLetter: { fontSize: 15, fontWeight: '700' },
  swim: { fontSize: 12 },
  wrap: { gap: 4 },
  grid: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  calRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  gutter: { width: 30, color: C.sub, fontSize: 11 },
  calHead: { flex: 1, textAlign: 'center', color: C.sub, fontSize: 11 },
  calCell: { flex: 1, aspectRatio: 1.2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  calDay: { fontSize: 12 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: C.sub, fontSize: 12 },
});
