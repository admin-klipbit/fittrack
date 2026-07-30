# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Project gotchas already handled — don't regress them:
- expo-file-system: use the new `File`/`Directory`/`Paths` API (legacy API throws at runtime in SDK 57).
- `metro.config.js` aliases `punycode` for markdown-it (Coach tab). Keep it.
- iCloud path comes from the local native module in `modules/icloud/` — JS cannot get the ubiquity container URL any other way.
