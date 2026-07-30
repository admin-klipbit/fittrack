import { openDatabaseSync } from 'expo-sqlite';
import {
  DEFAULT_BLOCKS, Day, PROGRAM_START, SEED_EXERCISES, START_WEIGHT, localISODate, programWeek, weekDates,
} from './program';
import { mirrorData } from './mirror';

export const db = openDatabaseSync('fittrack.db');

// ---- types ----

export type Exercise = {
  id: string; name: string; day: Day; position: number;
  sets: number; rep_low: number; rep_high: number;
  weight: number; increment: number; rest_sec: number; per_side: number;
  cues: string; lib_id: string | null; custom_photo: string | null;
  unit: string; // 'kg' | 'placas' (cable-stack plate count)
};

// Weight semantics: 'kg_each' = weight of ONE dumbbell (one in each hand / per side);
// plain 'kg' = total weight of the single implement (goblet DB, EZ bar, one overhead DB).
export const unitLabel = (u?: string) => (u === 'placas' ? ' placas' : u === 'kg_each' ? 'kg each' : 'kg');
export const unitShort = (u?: string) => (u === 'placas' ? ' pl' : u === 'kg_each' ? 'kg ea' : 'kg');
export const weightLabel = (u?: string) => (u === 'placas' ? 'PLACAS' : u === 'kg_each' ? 'WEIGHT (EACH DB)' : 'WEIGHT');
export type Workout = {
  id: number; day: Day; started_at: string; finished_at: string | null;
  cur_ex: number; cur_set: number;
};
export type SetRow = {
  id: number; workout_id: number; exercise_id: string;
  set_no: number; weight: number; reps: number; done_at: string;
};
export type Cardio = {
  id: number; date: string; type: 'run' | 'swim';
  duration_min: number | null; distance_km: number | null; meters: number | null;
  rpe: number | null; note: string | null; photo: string | null;
};
export type Weighin = { id: number; date: string; kg: number };
export type Meal = {
  id: number; date: string; time: string; type: string;
  photo: string; description: string | null;
};
export type ProgressPhoto = {
  id: number; date: string; angle: 'front' | 'side' | 'back';
  photo: string; kg: number | null;
};

// ---- init / seed ----

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS exercises(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, day TEXT NOT NULL, position INTEGER NOT NULL,
      sets INTEGER NOT NULL, rep_low INTEGER NOT NULL, rep_high INTEGER NOT NULL,
      weight REAL NOT NULL, increment REAL NOT NULL, rest_sec INTEGER NOT NULL,
      per_side INTEGER NOT NULL DEFAULT 0,
      cues TEXT NOT NULL DEFAULT '[]', lib_id TEXT, custom_photo TEXT
    );
    CREATE TABLE IF NOT EXISTS workouts(
      id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL,
      started_at TEXT NOT NULL, finished_at TEXT,
      cur_ex INTEGER NOT NULL DEFAULT 0, cur_set INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sets(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id),
      exercise_id TEXT NOT NULL, set_no INTEGER NOT NULL,
      weight REAL NOT NULL, reps INTEGER NOT NULL, done_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cardio(
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, type TEXT NOT NULL,
      duration_min REAL, distance_km REAL, meters INTEGER, rpe INTEGER, note TEXT, photo TEXT
    );
    CREATE TABLE IF NOT EXISTS weighins(
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, kg REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meals(
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL,
      type TEXT NOT NULL, photo TEXT NOT NULL, description TEXT
    );
    CREATE TABLE IF NOT EXISTS progress_photos(
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, angle TEXT NOT NULL,
      photo TEXT NOT NULL, kg REAL, UNIQUE(date, angle)
    );
  `);
  const count = db.getFirstSync<{ n: number }>('SELECT COUNT(*) n FROM exercises');
  if (!count?.n) seed();
  migrate();
}

function migrate() {
  try { db.execSync("ALTER TABLE exercises ADD COLUMN unit TEXT NOT NULL DEFAULT 'kg'"); } catch {}
  // Lat pulldown stack is counted in placas (plates), not kg. Convert the
  // pseudo-kg history proportionally, anchored on: close-grip 9 placas ≈ 70,
  // wide-grip 8 placas ≈ 66 (user-confirmed 2026-07-21).
  if (getSetting('placas_migrated') !== '1') {
    const conv: [string, number, number][] = [
      ['Wide-Grip_Lat_Pulldown', 8 / 66, 8],
      ['Close-Grip_Front_Lat_Pulldown', 9 / 70, 9],
    ];
    for (const [id, factor, current] of conv) {
      db.runSync("UPDATE exercises SET unit='placas', increment=1, weight=? WHERE id=?", [current, id]);
      const rows = db.getAllSync<{ id: number; weight: number }>('SELECT id, weight FROM sets WHERE exercise_id=?', [id]);
      for (const r of rows) {
        db.runSync('UPDATE sets SET weight=? WHERE id=?', [Math.max(1, Math.round(r.weight * factor)), r.id]);
      }
    }
    setSetting('placas_migrated', '1');
    mirrorData('workouts');
  }
  // Mark two-DB moves so the UI can say whether weight is per dumbbell or total.
  if (getSetting('units_each_migrated') !== '1') {
    const each = [
      'Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Dumbbell_Flyes', 'Seated_Dumbbell_Press',
      'Side_Lateral_Raise', 'Reverse_Flyes', 'Alternate_Hammer_Curl', 'One-Arm_Dumbbell_Row',
      'Stiff-Legged_Dumbbell_Deadlift', 'Standing_Dumbbell_Calf_Raise', 'Dumbbell_Lunges',
      'Split_Squat_with_Dumbbells',
    ];
    db.runSync(
      `UPDATE exercises SET unit='kg_each' WHERE unit='kg' AND id IN (${each.map(() => '?').join(',')})`,
      each,
    );
    setSetting('units_each_migrated', '1');
  }
  // User swapped DB curls for an EZ bar ("rosca direta barra W", 2026-07-24) — one
  // both-arms movement instead of two DBs. Weight is the whole bar. Same row/id, so
  // the 15–16kg sets already logged under DB Curl stay attached.
  if (getSetting('ezbar_migrated') !== '1') {
    db.runSync(
      `UPDATE exercises SET name='EZ-Bar Curl (Barra W)', weight=16, cues=? WHERE id='Dumbbell_Bicep_Curl'`,
      [JSON.stringify([
        'Shoulder-width grip on the angled bar',
        'Elbows pinned — no leaning back or shrugging',
        'Full stretch at the bottom every rep',
      ])],
    );
    setSetting('ezbar_migrated', '1');
  }
}

function seed() {
  for (const e of SEED_EXERCISES) {
    db.runSync(
      `INSERT INTO exercises(id,name,day,position,sets,rep_low,rep_high,weight,increment,rest_sec,per_side,cues,lib_id)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [e.id, e.name, e.day, e.position, e.sets, e.repLow, e.repHigh, e.weight, e.increment,
       e.restSec, e.perSide ? 1 : 0, JSON.stringify(e.cues), e.libId],
    );
  }
  db.runSync('INSERT OR IGNORE INTO weighins(date,kg) VALUES(?,?)', [PROGRAM_START, START_WEIGHT]);
  DEFAULT_BLOCKS.forEach((b, i) => {
    setSetting(`block_${i + 1}_name`, b.name);
    setSetting(`block_${i + 1}_focus`, b.focus);
  });
}

// ---- settings ----

export function getSetting(key: string, def = ''): string {
  return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key=?', [key])?.value ?? def;
}
export function setSetting(key: string, value: string) {
  db.runSync('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
}

export function blockMeta(block: number) {
  const def = DEFAULT_BLOCKS[block - 1] ?? { name: `Block ${block}`, focus: '' };
  return {
    name: getSetting(`block_${block}_name`, def.name),
    focus: getSetting(`block_${block}_focus`, def.focus),
  };
}

// ---- exercises ----

export function exercisesForDay(day: Day): Exercise[] {
  return db.getAllSync<Exercise>('SELECT * FROM exercises WHERE day=? ORDER BY position', [day]);
}
export function getExercise(id: string): Exercise | null {
  return db.getFirstSync<Exercise>('SELECT * FROM exercises WHERE id=?', [id]);
}
export function updateExercise(id: string, fields: Partial<Exercise>) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db.runSync(
    `UPDATE exercises SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`,
    [...keys.map((k) => (fields as any)[k]), id],
  );
}
export function addCustomExercise(e: {
  name: string; day: Day; sets: number; repLow: number; repHigh: number;
  weight: number; increment: number; restSec: number; perSide: boolean;
  libId: string | null; customPhoto: string | null;
}) {
  const id = 'custom_' + Date.now();
  const pos = (db.getFirstSync<{ m: number }>('SELECT COALESCE(MAX(position),0) m FROM exercises WHERE day=?', [e.day])?.m ?? 0) + 1;
  db.runSync(
    `INSERT INTO exercises(id,name,day,position,sets,rep_low,rep_high,weight,increment,rest_sec,per_side,cues,lib_id,custom_photo)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,'[]',?,?)`,
    [id, e.name, e.day, pos, e.sets, e.repLow, e.repHigh, e.weight, e.increment, e.restSec, e.perSide ? 1 : 0, e.libId, e.customPhoto],
  );
  return id;
}

// ---- workouts / sets ----

export function activeWorkout(): Workout | null {
  return db.getFirstSync<Workout>('SELECT * FROM workouts WHERE finished_at IS NULL ORDER BY id DESC LIMIT 1');
}
export function startWorkout(day: Day): Workout {
  db.runSync('INSERT INTO workouts(day,started_at) VALUES(?,?)', [day, new Date().toISOString()]);
  return activeWorkout()!;
}
export function saveWorkoutPos(id: number, curEx: number, curSet: number) {
  db.runSync('UPDATE workouts SET cur_ex=?, cur_set=? WHERE id=?', [curEx, curSet, id]);
}
export function logSet(workoutId: number, exerciseId: string, setNo: number, weight: number, reps: number) {
  db.runSync(
    'INSERT INTO sets(workout_id,exercise_id,set_no,weight,reps,done_at) VALUES(?,?,?,?,?,?)',
    [workoutId, exerciseId, setNo, weight, reps, new Date().toISOString()],
  );
  mirrorData('workouts');
}
export function finishWorkout(id: number) {
  db.runSync('UPDATE workouts SET finished_at=? WHERE id=?', [new Date().toISOString(), id]);
  mirrorData('workouts');
}
export function discardWorkout(id: number) {
  db.runSync('DELETE FROM sets WHERE workout_id=?', [id]);
  db.runSync('DELETE FROM workouts WHERE id=?', [id]);
  mirrorData('workouts');
}
export function getWorkout(id: number): Workout | null {
  return db.getFirstSync<Workout>('SELECT * FROM workouts WHERE id=?', [id]);
}
export function setsForWorkout(workoutId: number): SetRow[] {
  return db.getAllSync<SetRow>('SELECT * FROM sets WHERE workout_id=? ORDER BY id', [workoutId]);
}
export function completedWorkouts(limit = 50): Workout[] {
  return db.getAllSync<Workout>('SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?', [limit]);
}
export function completedWorkoutCount(): number {
  return db.getFirstSync<{ n: number }>('SELECT COUNT(*) n FROM workouts WHERE finished_at IS NOT NULL')?.n ?? 0;
}

/** Sets for this exercise from the most recent finished workout that included it. */
export function lastSessionSets(exerciseId: string, excludeWorkoutId?: number): SetRow[] {
  const w = db.getFirstSync<{ id: number }>(
    `SELECT w.id FROM workouts w JOIN sets s ON s.workout_id=w.id
     WHERE s.exercise_id=? AND w.finished_at IS NOT NULL AND w.id != ?
     ORDER BY w.started_at DESC LIMIT 1`,
    [exerciseId, excludeWorkoutId ?? -1],
  );
  if (!w) return [];
  return db.getAllSync<SetRow>('SELECT * FROM sets WHERE workout_id=? AND exercise_id=? ORDER BY set_no', [w.id, exerciseId]);
}

/** Double progression: last session hit every set at rep_high → suggest +increment at rep_low. */
export function progression(e: Exercise, excludeWorkoutId?: number) {
  const prev = lastSessionSets(e.id, excludeWorkoutId);
  const increase =
    prev.length >= e.sets &&
    prev.every((s) => s.reps >= e.rep_high) &&
    prev.every((s) => s.weight === prev[0].weight);
  if (increase) {
    return { increase: true, weight: prev[0].weight + e.increment, targetReps: e.rep_low, prev };
  }
  return { increase: false, weight: prev[0]?.weight ?? e.weight, targetReps: e.rep_high, prev };
}

export function maxWeightBefore(exerciseId: string, workoutId: number): number {
  return db.getFirstSync<{ m: number }>(
    'SELECT COALESCE(MAX(weight),0) m FROM sets WHERE exercise_id=? AND workout_id != ? AND reps > 0',
    [exerciseId, workoutId],
  )?.m ?? 0;
}

export function workoutsFinishedBetween(start: string, end: string): Workout[] {
  return db.getAllSync<Workout>(
    "SELECT * FROM workouts WHERE finished_at IS NOT NULL AND date(started_at,'localtime') BETWEEN ? AND ? ORDER BY started_at",
    [start, end],
  );
}

// ---- cardio ----

export function addCardio(c: Omit<Cardio, 'id'>) {
  db.runSync(
    'INSERT INTO cardio(date,type,duration_min,distance_km,meters,rpe,note,photo) VALUES(?,?,?,?,?,?,?,?)',
    [c.date, c.type, c.duration_min, c.distance_km, c.meters, c.rpe, c.note, c.photo],
  );
  mirrorData('cardio');
}
export function listCardio(limit = 30): Cardio[] {
  return db.getAllSync<Cardio>('SELECT * FROM cardio ORDER BY date DESC, id DESC LIMIT ?', [limit]);
}
export function cardioBetween(start: string, end: string): Cardio[] {
  return db.getAllSync<Cardio>('SELECT * FROM cardio WHERE date BETWEEN ? AND ? ORDER BY date', [start, end]);
}

// ---- weigh-ins ----

export function addWeighin(date: string, kg: number) {
  db.runSync('INSERT INTO weighins(date,kg) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET kg=excluded.kg', [date, kg]);
  mirrorData('weighins');
}
export function weighins(): Weighin[] {
  return db.getAllSync<Weighin>('SELECT * FROM weighins ORDER BY date');
}
export function latestWeighin(): Weighin | null {
  return db.getFirstSync<Weighin>('SELECT * FROM weighins ORDER BY date DESC LIMIT 1');
}
/** 7-day rolling average ending at each entry's date. */
export function weighinsWithAvg(): (Weighin & { avg: number })[] {
  const all = weighins();
  return all.map((w) => {
    const from = new Date(w.date + 'T00:00:00');
    from.setDate(from.getDate() - 6);
    const fromStr = localISODate(from);
    const win = all.filter((x) => x.date >= fromStr && x.date <= w.date);
    return { ...w, avg: win.reduce((s, x) => s + x.kg, 0) / win.length };
  });
}

// ---- meals ----

export function addMeal(m: Omit<Meal, 'id'>) {
  db.runSync('INSERT INTO meals(date,time,type,photo,description) VALUES(?,?,?,?,?)',
    [m.date, m.time, m.type, m.photo, m.description]);
  mirrorData('meals');
}
export function mealsGrouped(limitDays = 30): { date: string; data: Meal[] }[] {
  const rows = db.getAllSync<Meal>('SELECT * FROM meals ORDER BY date DESC, time DESC');
  const byDate = new Map<string, Meal[]>();
  for (const m of rows) {
    if (!byDate.has(m.date)) {
      if (byDate.size >= limitDays) break;
      byDate.set(m.date, []);
    }
    byDate.get(m.date)!.push(m);
  }
  return [...byDate.entries()].map(([date, data]) => ({ date, data }));
}

// ---- progress photos ----

export function addProgressPhoto(p: Omit<ProgressPhoto, 'id'>) {
  db.runSync(
    `INSERT INTO progress_photos(date,angle,photo,kg) VALUES(?,?,?,?)
     ON CONFLICT(date,angle) DO UPDATE SET photo=excluded.photo, kg=excluded.kg`,
    [p.date, p.angle, p.photo, p.kg],
  );
  mirrorData('progress');
}
export function progressPhotos(angle?: string): ProgressPhoto[] {
  return angle
    ? db.getAllSync<ProgressPhoto>('SELECT * FROM progress_photos WHERE angle=? ORDER BY date', [angle])
    : db.getAllSync<ProgressPhoto>('SELECT * FROM progress_photos ORDER BY date');
}
export function latestProgressPhoto(angle: string): ProgressPhoto | null {
  return db.getFirstSync<ProgressPhoto>('SELECT * FROM progress_photos WHERE angle=? ORDER BY date DESC LIMIT 1', [angle]);
}

// ---- dashboard helpers ----

export function thisWeekCounts() {
  const { start, end } = weekDates();
  const workoutsN = db.getFirstSync<{ n: number }>(
    "SELECT COUNT(*) n FROM workouts WHERE finished_at IS NOT NULL AND date(started_at,'localtime') BETWEEN ? AND ?",
    [start, end],
  )?.n ?? 0;
  const cardioN = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) n FROM cardio WHERE date BETWEEN ? AND ?', [start, end],
  )?.n ?? 0;
  return { workouts: workoutsN, cardio: cardioN };
}

/** Consecutive program weeks (ending this week) that hit the weekly cardio target. */
export function cardioStreakWeeks(target: number): number {
  const current = programWeek();
  let streak = 0;
  for (let w = current; w >= 1; w--) {
    const { start, end } = weekDates(w);
    const n = db.getFirstSync<{ n: number }>('SELECT COUNT(*) n FROM cardio WHERE date BETWEEN ? AND ?', [start, end])?.n ?? 0;
    if (n >= target) streak++;
    else if (w !== current) break; // current week still in progress doesn't break the streak
  }
  return streak;
}

/** Activity level per date (for the heat map): 1 workout, 2 cardio, 3 both. */
export function activityMarks(start: string, end: string): Record<string, number> {
  const marks: Record<string, number> = {};
  for (const w of workoutsFinishedBetween(start, end)) {
    const d = localISODate(new Date(w.started_at));
    marks[d] = (marks[d] ?? 0) | 1;
  }
  for (const c of cardioBetween(start, end)) {
    marks[c.date] = (marks[c.date] ?? 0) | 2;
  }
  return marks;
}
