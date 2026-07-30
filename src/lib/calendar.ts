// Dedicated "FitTrack" calendar: planned workout + cardio events, ✅ on completion,
// no-guilt rescheduling — past unfinished events roll forward to the next free slot.

import * as Calendar from 'expo-calendar/legacy';
import { getSetting, setSetting } from './db';
import { addDays, parseDate, today } from './program';

const TITLES = { workout: 'FitTrack Workout 💪', cardio: 'FitTrack Cardio 🏃' };
const DONE = '✅ ';
const HORIZON_DAYS = 14;

export type PlanType = keyof typeof TITLES;

export const calendarEnabled = () => getSetting('cal_enabled') === '1';

const defaults = {
  workout_days: '1,2,3,4,5', // JS getDay(): Mon–Fri
  cardio_days: '2,4,6', // Tue, Thu, Sat
  workout_time: '07:00',
  cardio_time: '18:00',
};
export function planConfig() {
  return {
    workoutDays: getSetting('workout_days', defaults.workout_days).split(',').map(Number),
    cardioDays: getSetting('cardio_days', defaults.cardio_days).split(',').map(Number),
    workoutTime: getSetting('workout_time', defaults.workout_time),
    cardioTime: getSetting('cardio_time', defaults.cardio_time),
  };
}

async function getCalendarId(): Promise<string | null> {
  const saved = getSetting('cal_id');
  if (saved) {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (cals.some((c) => c.id === saved)) return saved;
  }
  return null;
}

export async function enableCalendarSync(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return false;
  let id = await getCalendarId();
  if (!id) {
    const def = await Calendar.getDefaultCalendarAsync();
    id = await Calendar.createCalendarAsync({
      title: 'FitTrack',
      color: '#3DDC5A',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: def.source.id,
      source: def.source,
      name: 'FitTrack',
      ownerAccount: 'FitTrack',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    setSetting('cal_id', id);
  }
  setSetting('cal_enabled', '1');
  await syncCalendar();
  return true;
}

export async function disableCalendarSync() {
  setSetting('cal_enabled', '0');
  const id = await getCalendarId();
  if (id) {
    try { await Calendar.deleteCalendarAsync(id); } catch {}
    setSetting('cal_id', '');
  }
}

function eventDate(dateStr: string, hhmm: string): Date {
  const d = parseDate(dateStr);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

async function eventsInRange(id: string, startStr: string, endStr: string) {
  const end = parseDate(endStr);
  end.setHours(23, 59, 59, 0);
  return Calendar.getEventsAsync([id], parseDate(startStr), end);
}

const typeOf = (title: string): PlanType | null =>
  title.includes('Workout') ? 'workout' : title.includes('Cardio') ? 'cardio' : null;
const dateOf = (e: Calendar.Event) => {
  const d = new Date(e.startDate as any);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Create upcoming planned events + roll past unfinished ones forward. */
export async function syncCalendar() {
  if (!calendarEnabled()) return;
  const id = await getCalendarId();
  if (!id) return;
  const cfg = planConfig();
  const t = today();
  const horizon = addDays(t, HORIZON_DAYS);
  const events = await eventsInRange(id, addDays(t, -60), horizon);

  const occupied = (type: PlanType, date: string) =>
    events.some((e) => typeOf(e.title) === type && dateOf(e) === date);

  // 1. Roll past, unfinished planned events forward to the next free slot.
  for (const e of events) {
    const type = typeOf(e.title);
    if (!type || e.title.startsWith(DONE) || dateOf(e) >= t) continue;
    let target = t;
    while (occupied(type, target)) target = addDays(target, 1);
    const time = type === 'workout' ? cfg.workoutTime : cfg.cardioTime;
    const start = eventDate(target, time);
    await Calendar.updateEventAsync(e.id, {
      startDate: start,
      endDate: new Date(start.getTime() + 45 * 60000),
    });
    e.startDate = start.toISOString() as any; // keep `occupied` accurate
  }

  // 2. Fill the horizon with planned events on configured days.
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(t, i);
    const dow = parseDate(date).getDay();
    for (const type of ['workout', 'cardio'] as PlanType[]) {
      const days = type === 'workout' ? cfg.workoutDays : cfg.cardioDays;
      if (!days.includes(dow) || occupied(type, date)) continue;
      const start = eventDate(date, type === 'workout' ? cfg.workoutTime : cfg.cardioTime);
      const evId = await Calendar.createEventAsync(id, {
        title: TITLES[type],
        startDate: start,
        endDate: new Date(start.getTime() + 45 * 60000),
        notes: 'Planned by FitTrack',
      });
      events.push({ id: evId, title: TITLES[type], startDate: start.toISOString() } as any);
    }
  }
}

/** Mark today's planned event of this type as done (✅). */
export async function markDoneToday(type: PlanType) {
  if (!calendarEnabled()) return;
  const id = await getCalendarId();
  if (!id) return;
  const t = today();
  const events = await eventsInRange(id, t, t);
  const e = events.find((x) => typeOf(x.title) === type && !x.title.startsWith(DONE));
  if (e) await Calendar.updateEventAsync(e.id, { title: DONE + e.title });
}

/** One-tap postpone: move the next planned event of this type to the next free day. */
export async function postponeNext(type: PlanType): Promise<string | null> {
  if (!calendarEnabled()) return null;
  const id = await getCalendarId();
  if (!id) return null;
  const t = today();
  const events = await eventsInRange(id, t, addDays(t, HORIZON_DAYS + 7));
  const upcoming = events
    .filter((e) => typeOf(e.title) === type && !e.title.startsWith(DONE))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)))[0];
  if (!upcoming) return null;
  let target = addDays(dateOf(upcoming), 1);
  const occupied = (date: string) =>
    events.some((e) => e.id !== upcoming.id && typeOf(e.title) === type && dateOf(e) === date);
  while (occupied(target)) target = addDays(target, 1);
  const time = type === 'workout' ? planConfig().workoutTime : planConfig().cardioTime;
  const start = eventDate(target, time);
  await Calendar.updateEventAsync(upcoming.id, {
    startDate: start,
    endDate: new Date(start.getTime() + 45 * 60000),
  });
  return target;
}
