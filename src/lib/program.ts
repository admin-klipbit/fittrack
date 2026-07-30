// Program constants and date math. Pure — no DB imports (db.ts imports us).

export const PROGRAM_START = '2026-07-09';
export const START_WEIGHT = 76.3;
export const WEEKS_PER_BLOCK = 8;
export const TOTAL_WEEKS = 32;
export const DEFAULT_SESSIONS_PER_WEEK = 5;
export const DEFAULT_CARDIO_PER_WEEK = 3;

export const DEFAULT_BLOCKS = [
  { name: 'Rebuild', focus: 'Return from pause — recomp, groove technique' },
  { name: 'Build', focus: 'Progressive overload — add weight and reps' },
  { name: 'Cut', focus: 'Fat loss — keep strength, tighten diet' },
  { name: 'Polish', focus: 'Refine — bring up weak points' },
];

export type Day = 'A' | 'B' | 'C';
export const DAYS: Day[] = ['A', 'B', 'C'];
export const DAY_NAMES: Record<Day, string> = {
  A: 'Chest · Shoulders · Triceps',
  B: 'Back · Biceps',
  C: 'Legs',
};

export type SeedExercise = {
  id: string;
  name: string;
  day: Day;
  position: number;
  sets: number;
  repLow: number; // target after a weight increase (double progression)
  repHigh: number; // clean top — triggers the increase
  weight: number; // kg; for two-DB moves this is per dumbbell
  increment: number;
  restSec: number;
  perSide: boolean;
  libId: string; // free-exercise-db id (bundled images)
  cues: string[];
};

const ex = (
  day: Day, position: number, name: string, libId: string,
  sets: number, repLow: number, repHigh: number,
  weight: number, increment: number, restSec: number,
  cues: string[], perSide = false,
): SeedExercise => ({
  id: libId, name, day, position, sets, repLow, repHigh,
  weight, increment, restSec, perSide, libId, cues,
});

export const SEED_EXERCISES: SeedExercise[] = [
  // Day A — Chest / Shoulders / Triceps
  ex('A', 1, 'Flat DB Press', 'Dumbbell_Bench_Press', 3, 8, 12, 14, 2, 90, [
    'Shoulder blades pinched, feet planted, slight arch',
    'Lower to nipple line, elbows ~45° from torso',
    'Press up and slightly together, no hard lockout',
  ]),
  ex('A', 2, 'Incline DB Press', 'Incline_Dumbbell_Press', 3, 8, 12, 14, 2, 90, [
    'Bench 30–45°, back and hips glued to it',
    'Lower until DBs reach upper-chest level',
    'Drive up without flaring elbows past 60°',
  ]),
  ex('A', 3, 'Flat DB Fly', 'Dumbbell_Flyes', 3, 8, 12, 12, 2, 60, [
    'Slight, fixed elbow bend the whole rep',
    'Open until a chest stretch — not shoulder pain',
    'Hug a barrel back up, squeeze the chest',
  ]),
  ex('A', 4, 'Seated DB Shoulder Press', 'Seated_Dumbbell_Press', 3, 8, 10, 8, 2, 90, [
    'Back supported, DBs at ear height to start',
    'Press up until arms straight, biceps near ears',
    'Ribs down — don’t arch to grind out reps',
  ]),
  ex('A', 5, 'DB Lateral Raise', 'Side_Lateral_Raise', 3, 8, 12, 8, 1, 60, [
    'Lead with elbows, tiny bend, no swinging',
    'Raise to shoulder height, pinkies slightly up',
    'Control the way down — 2s negative',
  ]),
  ex('A', 6, 'Overhead DB Triceps Extension', 'Standing_Dumbbell_Triceps_Extension', 3, 8, 12, 10, 2, 60, [
    'Both hands under the top plate, elbows close to head',
    'Lower behind the head until a triceps stretch',
    'Extend without letting elbows drift out',
  ]),
  // Day B — Back / Biceps
  ex('B', 1, 'Wide-Grip Lat Pulldown', 'Wide-Grip_Lat_Pulldown', 3, 8, 12, 59, 5, 90, [
    'Grip wide, chest tall, slight lean back',
    'Pull the bar to upper chest with elbows down-and-back',
    'Control up to a full lat stretch — no yanking',
  ]),
  ex('B', 2, 'Close-Grip Lat Pulldown', 'Close-Grip_Front_Lat_Pulldown', 3, 8, 10, 45, 5, 90, [
    'Hands close, palms facing or underhand',
    'Drive elbows to your hips, bar to sternum',
    'Squeeze the lats, don’t row with the arms only',
  ]),
  ex('B', 3, 'One-Arm DB Row', 'One-Arm_Dumbbell_Row', 3, 8, 10, 16, 2, 90, [
    'Knee and hand on bench, flat back',
    'Pull the DB to your hip pocket, not your shoulder',
    'No torso twist — the elbow does the work',
  ], true),
  ex('B', 4, 'Bent-Over Rear Delt Fly', 'Reverse_Flyes', 3, 8, 12, 6, 1, 60, [
    'Hinge to ~45°, back flat, soft elbows',
    'Raise out and back, thumbs slightly down',
    'Light weight, strict — no bouncing',
  ]),
  ex('B', 5, 'Alternating Hammer Curl', 'Alternate_Hammer_Curl', 3, 8, 12, 8, 1, 60, [
    'Neutral grip, elbows pinned to your sides',
    'Curl one arm at a time, no shoulder swing',
    'Squeeze at the top, slow negative',
  ], true),
  ex('B', 6, 'DB Curl', 'Dumbbell_Bicep_Curl', 3, 8, 12, 7, 1, 60, [
    'Palms up, elbows pinned to your sides',
    'Curl without leaning back or shrugging',
    'Full stretch at the bottom every rep',
  ]),
  // Day C — Legs
  ex('C', 1, 'Goblet Squat', 'Goblet_Squat', 3, 8, 10, 12, 2, 90, [
    'DB by the horns tight to your chest',
    'Sit down between your heels, chest tall',
    'Elbows push knees out at the bottom',
  ]),
  ex('C', 2, 'DB Romanian Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 3, 8, 10, 14, 2, 90, [
    'Weight is per dumbbell (2 DBs)',
    'Push hips back, soft knees, flat back',
    'Lower until hamstrings stretch, then stand tall',
  ]),
  ex('C', 3, 'Bulgarian Split Squat', 'Split_Squat_with_Dumbbells', 3, 8, 10, 0, 2, 90, [
    'Rear foot on bench, front shin vertical',
    'Bodyweight first — add DBs when 3×10 is clean',
    'Drop straight down, front heel stays planted',
  ], true),
  ex('C', 4, 'DB Walking Lunge', 'Dumbbell_Lunges', 3, 8, 10, 8, 2, 90, [
    'DB in each hand, torso upright',
    'Long step, back knee kisses the floor',
    'Push through the front heel to step through',
  ], true),
  ex('C', 5, 'Standing DB Calf Raise', 'Standing_Dumbbell_Calf_Raise', 3, 12, 15, 16, 2, 60, [
    'Balls of feet on a plate or step edge',
    'Full stretch at the bottom, pause at the top',
    'No bouncing — make the calf do it',
  ]),
];

// ---- dates ----

export function localISODate(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export const today = () => localISODate();

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return localISODate(d);
}

/** 1-based day count since program start (day 1 = start date). */
export function programDay(dateStr: string = today()): number {
  return Math.floor((parseDate(dateStr).getTime() - parseDate(PROGRAM_START).getTime()) / 86400000) + 1;
}

/** 1-based program week. Weeks are 7-day periods anchored to the start date. */
export function programWeek(dateStr: string = today()): number {
  return Math.max(1, Math.ceil(programDay(dateStr) / 7));
}

export function blockInfo(week: number = programWeek()) {
  const block = Math.min(4, Math.ceil(week / WEEKS_PER_BLOCK));
  const weekInBlock = Math.min(WEEKS_PER_BLOCK, week - (block - 1) * WEEKS_PER_BLOCK);
  return { block, weekInBlock, week };
}

/** Date range (inclusive) covered by a block. */
export function blockDates(block: number) {
  const start = addDays(PROGRAM_START, (block - 1) * WEEKS_PER_BLOCK * 7);
  const end = addDays(start, WEEKS_PER_BLOCK * 7 - 1);
  return { start, end };
}

/** Current program week's date range. */
export function weekDates(week: number = programWeek()) {
  const start = addDays(PROGRAM_START, (week - 1) * 7);
  return { start, end: addDays(start, 6) };
}
