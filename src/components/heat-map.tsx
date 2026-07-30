// Month activity calendar + current-week plan strip.
// marks: date -> 1 workout | 2 cardio | 3 both.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';
import { SWIM_PLAN_DAYS, WEEKDAY_PLAN, activityMarks } from '@/lib/db';
import { addDays, parseDate, today } from '@/lib/program';

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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Regular month calendar: weeks as Mon–Sun rows, days colored by activity. */
export function MonthCalendar() {
  const [ym, setYm] = useState(() => today().slice(0, 7)); // 'YYYY-MM'
  const t = today();
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const offset = (parseDate(first).getDay() + 6) % 7; // days shown before the 1st
  const daysInMonth = new Date(y, m, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const gridStart = addDays(first, -offset);
  const marks = activityMarks(gridStart, addDays(gridStart, rows * 7 - 1));
  const shift = (d: number) => {
    const nm = new Date(y, m - 1 + d, 1);
    setYm(`${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <View style={s.wrap}>
      <View style={s.monthHead}>
        <Pressable onPress={() => shift(-1)} hitSlop={10}><Text style={s.nav}>‹</Text></Pressable>
        <Text style={s.monthTitle}>{MONTHS[m - 1]} {y}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={10}><Text style={s.nav}>›</Text></Pressable>
      </View>
      <View style={s.calRow}>
        {Array.from({ length: 7 }, (_, d) => (
          <Text key={d} style={s.calHead}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]}</Text>
        ))}
      </View>
      {Array.from({ length: rows }, (_, w) => (
        <View key={w} style={s.calRow}>
          {Array.from({ length: 7 }, (_, d) => {
            const date = addDays(gridStart, w * 7 + d);
            const inMonth = date.slice(0, 7) === ym;
            const mk = date > t ? 0 : marks[date] ?? 0;
            return (
              <View
                key={d}
                style={[
                  s.calCell,
                  mk > 0 && { backgroundColor: COLORS[mk] },
                  date === t && { borderWidth: 1.5, borderColor: C.sub },
                ]}
              >
                <Text style={[s.calDay, {
                  color: !inMonth ? 'transparent' : mk ? C.text : date > t ? C.border : C.sub,
                }]}>
                  {Number(date.slice(8))}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
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
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  monthTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  nav: { color: C.sub, fontSize: 24, paddingHorizontal: 10 },
  calRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  calHead: { flex: 1, textAlign: 'center', color: C.sub, fontSize: 11 },
  calCell: { flex: 1, aspectRatio: 1.15, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  calDay: { fontSize: 13 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: C.sub, fontSize: 12 },
});
