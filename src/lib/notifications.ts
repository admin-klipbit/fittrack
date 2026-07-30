import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getSetting } from './db';

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DEFAULT_PHOTO_DAY = 4; // Thursday (JS getDay) — same morning as the Thu weigh-in

export const photoDay = () => Number(getSetting('photo_day', String(DEFAULT_PHOTO_DAY)));

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotifPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Rest-timer: fires even if the phone is locked. Cancel when the next set is logged early. */
export async function scheduleRestNotification(seconds: number): Promise<string | null> {
  if (!(await ensureNotifPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Rest over', body: 'Next set 💪', sound: true },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds) },
  });
}

export async function cancelNotification(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

const REMINDER_IDS = ['weigh-mon', 'weigh-thu', 'photo-day'];

export async function setWeeklyReminders(on: boolean) {
  for (const id of REMINDER_IDS) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  if (!on) return;
  if (!(await ensureNotifPermission())) return;
  const pd = photoDay();
  const reminders = [
    { id: 'weigh-mon', weekday: 2, hour: 8, minute: 0, title: 'Weigh-in', body: 'Morning weigh-in — before breakfast ⚖️' },
    { id: 'weigh-thu', weekday: 5, hour: 8, minute: 0, title: 'Weigh-in', body: 'Morning weigh-in — before breakfast ⚖️' },
    // expo weekday is 1 = Sunday … 7 = Saturday
    { id: 'photo-day', weekday: pd + 1, hour: 9, minute: 0, title: 'Progress photos', body: `${DAY_LABELS[pd]} ritual: front / side / back 📸` },
  ];
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, sound: true },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: r.weekday,
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
}
