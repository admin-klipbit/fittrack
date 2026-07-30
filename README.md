# FitTrack

Personal iOS fitness tracker for a 32-week recomposition program (4 blocks × 8 weeks, started **2026-07-09** at 76.3kg). Expo SDK 57 + TypeScript + expo-router. Fully offline — SQLite is the source of truth, and everything is mirrored as human-readable JSON + photos to iCloud Drive so a nightly Claude Code session on the Mac can act as coach.

## How data flows

```
iPhone (SQLite, write-through) ──► iCloud Drive/FitTrack/
                                     data/workouts.json, cardio.json, weighins.json,
                                          meals.json, progress.json, program.json
                                     photos/meals/YYYY-MM-DD_mealtype_HHMM.jpg
                                     photos/progress/YYYY-MM-DD_{front,side,back}.jpg
                                     photos/cardio/YYYY-MM-DD_run.jpg
                                     review/latest-review.md   ◄── nightly Claude Code (Mac)
                                     review/history/
```

The app renders `review/latest-review.md` in the Coach tab. If iCloud is unavailable it falls back to local Documents (visible in Files → On My iPhone → FitTrack) with an Export button in Settings.

## The plan (pre-seeded, all weights editable)

A/B/C split for dumbbells + bench + lat pulldown only. Rolling queue A→B→C: "Start Workout" always offers the next day in the sequence — missing a day shifts the schedule, nothing is ever "missed". Double progression: hit the top reps on every set → the app badges "⬆ Increase weight" and prefills the next increment at the low rep target.

## Development

```bash
npm install
npx expo prebuild -p ios   # generates ios/ with iCloud entitlements + local ICloud module
npx expo run:ios           # dev build (iCloud needs a real device + signed build)
```

Note: iCloud Documents does **not** work in Expo Go — use a dev build. On simulator/no-iCloud the app silently falls back to local Documents.

## TestFlight

Uses the Klipbit Apple account (team `VH82CNB9ND`), bundle id `com.klipbit.fittrack` (change in `app.json` if needed — the iCloud container id `iCloud.com.klipbit.fittrack` must match).

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

First build: EAS will prompt to create signing credentials and the iCloud container. Make sure the App ID has the **iCloud (CloudDocuments)** capability — EAS syncs capabilities from the entitlements in `app.json` automatically.

## Timelapse

Front-view progress photos → video with week + weight overlay (runs on the Mac, needs `ffmpeg`):

```bash
./scripts/make-timelapse.sh                      # reads iCloud FitTrack folder → ./timelapse.mp4
./scripts/make-timelapse.sh /path/to/FitTrack out.mp4   # explicit paths
```

## Nightly coach review (Mac)

Run manually or via cron/launchd from any directory:

```bash
claude -p "Read all JSON in '~/Library/Mobile Documents/com~apple~CloudDocs/FitTrack/data/', today's meal photos in '../photos/meals/', and any run screenshots in '../photos/cardio/' (extract distance, pace, and duration from the Nike Run Club screenshots and write them back into cardio.json). You are my fitness coach for a 32-week program in 4×8-week blocks (recomposition: build muscle, lose fat; 1.78m, started 76.3kg; equipment: dumbbells, bench, lat pulldown only). Analyze today's training (volume vs last session, progression opportunities), cardio consistency, weight trend (7-day average only), and meal photos (rough calorie/protein adequacy, patterns — not exact numbers). Note where I am in the current block (see data/program.json). Write an encouraging but honest review with 2–3 concrete actions for tomorrow to FitTrack/review/latest-review.md and append a dated copy to FitTrack/review/history/. Under 300 words."
```

Example launchd plist (`~/Library/LaunchAgents/com.klipbit.fittrack-review.plist`) scheduling it nightly at 23:30 — edit the binary path, then `launchctl load` it.

## Structure

- `src/lib/db.ts` — SQLite schema, seed (plan + start weight), all data access
- `src/lib/mirror.ts` — iCloud/local JSON + photo write-through mirror
- `src/lib/program.ts` — plan constants, block/week math
- `src/lib/calendar.ts` — FitTrack calendar: planned events, ✅ on completion, roll-forward
- `src/app/workout/active.tsx` — in-gym logger (steppers, rest timer, keep-awake, crash restore)
- `src/app/photos/capture.tsx` — ghost-overlay progress photo capture
- `modules/icloud/` — 20-line native module exposing the iCloud container path
- `assets/exercises/` — bundled demo images (public domain, yuhonas/free-exercise-db)
