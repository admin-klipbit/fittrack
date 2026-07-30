// Human-readable JSON + photo mirror for the nightly Claude Code review.
// Root: iCloud Drive container Documents/FitTrack, falling back to the app's
// local Documents/FitTrack (still reachable via the Files app / Export).

import { Directory, File, Paths } from 'expo-file-system';
import { getICloudDocumentsUrl } from '../../modules/icloud';
import { db } from './db';
import { PROGRAM_START, START_WEIGHT, blockInfo } from './program';

let root: Directory | null = null;
let icloud = false;

const SUBDIRS = [
  ['data'],
  ['photos'], ['photos', 'meals'], ['photos', 'progress'], ['photos', 'cardio'],
  ['review'], ['review', 'history'],
];

export async function initMirror() {
  const url = await getICloudDocumentsUrl();
  icloud = !!url;
  root = url ? new Directory(url, 'FitTrack') : new Directory(Paths.document, 'FitTrack');
  root.create({ intermediates: true, idempotent: true });
  for (const segs of SUBDIRS) {
    segs.reduce((d, s) => new Directory(d, s), root).create({ idempotent: true });
  }
}

export const isICloud = () => icloud;
export const mirrorRootUri = () => root?.uri ?? '';

function fileAt(rel: string): File {
  const segs = rel.split('/');
  const name = segs.pop()!;
  const dir = segs.reduce((d, s) => new Directory(d, s), root!);
  return new File(dir, name);
}

/** Resolve a DB-stored relative path (e.g. photos/meals/x.jpg) to a renderable URI. */
export function photoUri(rel: string | null): string | undefined {
  return rel && root ? fileAt(rel).uri : undefined;
}

export function photoExists(rel: string): boolean {
  return !!root && fileAt(rel).exists;
}

/** Copy a captured/picked photo into the mirror at rel. Originals, never recompressed. */
export function savePhoto(srcUri: string, rel: string): string {
  const dest = fileAt(rel);
  if (dest.exists) dest.delete();
  new File(srcUri).copy(dest);
  return rel;
}

// ---- JSON mirrors ----

type Kind = 'workouts' | 'cardio' | 'weighins' | 'meals' | 'progress';

function buildJson(kind: Kind): unknown {
  switch (kind) {
    case 'workouts': {
      const workouts = db.getAllSync<any>('SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY started_at');
      return workouts.map((w) => ({
        id: w.id,
        day: w.day,
        started_at: w.started_at,
        finished_at: w.finished_at,
        note: w.note ?? null,
        sets: db.getAllSync<any>(
          `SELECT s.exercise_id, e.name exercise, s.set_no, s.weight, e.unit, s.reps, s.done_at
           FROM sets s LEFT JOIN exercises e ON e.id=s.exercise_id
           WHERE s.workout_id=? ORDER BY s.id`, [w.id]),
      }));
    }
    case 'cardio':
      return db.getAllSync('SELECT * FROM cardio ORDER BY date');
    case 'weighins':
      return db.getAllSync('SELECT date, kg FROM weighins ORDER BY date');
    case 'meals':
      // text-only meals store '' — surface as null so the nightly review knows there's no image
      return db.getAllSync("SELECT date, time, type, NULLIF(photo,'') photo, description FROM meals ORDER BY date, time");
    case 'progress':
      return db.getAllSync('SELECT date, angle, photo, kg FROM progress_photos ORDER BY date, angle');
  }
}

export function mirrorData(kind: Kind) {
  if (!root) return; // called before init (e.g. during seed) — mirrorAll() runs at startup
  try {
    fileAt(`data/${kind}.json`).write(JSON.stringify(buildJson(kind), null, 2));
  } catch (e) {
    console.warn('mirror write failed', kind, e);
  }
}

export function mirrorAll() {
  (['workouts', 'cardio', 'weighins', 'meals', 'progress'] as Kind[]).forEach(mirrorData);
  // Program context for the nightly coach: where we are, block names/goals.
  try {
    const { block, weekInBlock, week } = blockInfo();
    const blocks = [1, 2, 3, 4].map((b) => ({
      block: b,
      name: getSettingSafe(`block_${b}_name`),
      focus: getSettingSafe(`block_${b}_focus`),
    }));
    fileAt('data/program.json').write(JSON.stringify({
      program_start: PROGRAM_START,
      start_weight_kg: START_WEIGHT,
      structure: '4 blocks x 8 weeks',
      current: { week_overall: week, block, week_in_block: weekInBlock },
      blocks,
    }, null, 2));
  } catch (e) {
    console.warn('mirror program.json failed', e);
  }
}

function getSettingSafe(key: string): string {
  try {
    return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key=?', [key])?.value ?? '';
  } catch {
    return '';
  }
}

// ---- coach review ----

export function readReview(): { text: string; updatedAt: Date | null } | null {
  if (!root) return null;
  const f = fileAt('review/latest-review.md');
  if (!f.exists) return null;
  try {
    return {
      text: f.textSync(),
      updatedAt: f.lastModified ? new Date(f.lastModified) : null,
    };
  } catch {
    return null;
  }
}

/** Combined export for the manual share button (data only; photos live in the folder). */
export function writeExportFile(): string {
  const out = {
    exported_at: new Date().toISOString(),
    program: JSON.parse(fileAt('data/program.json').exists ? fileAt('data/program.json').textSync() : '{}'),
    workouts: buildJson('workouts'),
    cardio: buildJson('cardio'),
    weighins: buildJson('weighins'),
    meals: buildJson('meals'),
    progress: buildJson('progress'),
  };
  const f = fileAt('data/export.json');
  f.write(JSON.stringify(out, null, 2));
  return f.uri;
}
