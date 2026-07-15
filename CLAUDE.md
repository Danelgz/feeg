# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FEEG

FEEG is a premium, free workout tracking app. Mission: become the most beautiful, intuitive
and enjoyable fitness app — more premium-feeling than Hevy, Strong, Alpha Progress, GymStreak.
The goal is not to copy Hevy, it's to surpass every existing workout app.

## Core philosophy

Every feature must do at least one of: save time, increase motivation, make progress easier
to understand, make the app more enjoyable, or make users want to return daily. If it does
none of these, question whether it should exist.

## Before coding

1. Understand the problem. 2. Analyze the existing implementation. 3. Identify weaknesses.
4. Propose improvements. 5. Design the UX. 6. Design the architecture. 7. Only then implement.
Never skip straight to code on anything non-trivial. Always explain the plan first.

## Design

Every screen should feel premium, modern, clean, fast, delightful. Think Apple/Linear/Raycast/
Arc/Stripe as *directional* taste references (generous spacing, restrained color, obvious
hierarchy, intentional motion) — not a literal per-PR bar for a solo-dev free app. Avoid
generic AI-looking cards/dashboards. Every page should have its own visual identity.

Theme baseline (`docs/DESIGN.md`): black background, white text, mint green accent, minimalist,
Apple/Linear inspired, smooth animations, rounded corners, glass effects when appropriate. Never
ship an ugly interface.

## Components & code

Reusable, composable, single-responsibility, small. Avoid duplicated code — reuse
`components/ui/*` and `lib/tokens.js` before hardcoding colors/styles again. New files →
TypeScript. Existing JS files → don't force a mass rewrite for its own sake; migrate
opportunistically when touched for another reason. Never use `any` in new TS unless
unavoidable.

## UX

Minimum taps. Reduce friction. Anticipate the user's next action. Show/visualize instead of
explaining/listing.

## Statistics & muscle map

Statistics should feel exciting, not like a spreadsheet: heatmaps, body visualizations,
progress rings, interactive charts, milestones. The muscle map is a signature feature — but
"anatomically accurate" art requires licensed or illustrated assets, which is a real budget
decision, not a given; the current implementation is deliberately schematic. Keep improving
the data side (weekly/monthly volume, frequency, weak points) freely.

## Workout experience

Logging and finishing a workout should feel satisfying, with real micro-interactions and
positive feedback, not just functional.

## Performance & scalability

Avoid unnecessary re-renders. Optimize expensive calculations. Lazy load when appropriate.
Think about how the architecture holds up as features are added, not just the current PR.

## Criticism rule

Never blindly agree. If an idea is weak, say why and propose something better. Act like a
senior engineer, not an obedient assistant. The objective is the best product, not satisfying
the user's first draft of an idea.

## Definition of done

Not done because it works — done when it looks premium, feels premium, performs well, the
architecture scales, and the code is clean.

## Commands

```bash
npm run dev         # start dev server (localhost:3000)
npm run build       # production build
npm run start       # run production build
npm run lint        # ESLint (flat config, eslint.config.js)
npm run test        # run Vitest suite once
npm run test:watch  # Vitest in watch mode
```

Run a single test file with `npx vitest run path/to/file.test.ts` (or `npx vitest path/to/file.test.ts`
to watch just that file). Tests live next to the code they cover (e.g. `hooks/workoutSessionReducer.test.ts`,
`lib/exerciseStats.test.ts`) and run in `jsdom` via [vitest.config.ts](vitest.config.ts). Only a handful of
`lib`/`hooks` modules have coverage — most UI code has none.

There is no typecheck script — TypeScript is checked implicitly via `next build`/`next dev`; run
`npx tsc --noEmit` directly if you need a standalone check.

## Architecture

**Next.js 16 Pages Router** (not App Router) + React 19. Routing is file-based under `pages/`
(e.g. `pages/routines/[id].js` → `/routines/:id`). API routes live in `pages/api/`.

**State management**: no Redux/Zustand. A single global context, [context/UserContext.js](context/UserContext.js),
holds auth state, profile, routines, completed workouts, measures, social graph (following/followers),
theme/language/sound preferences, and exposes all mutator functions (`saveRoutine`, `saveCompletedWorkout`,
`startRoutine`, `handleFollow`, etc.). It's provided once in [pages/_app.js](pages/_app.js).

**Persistence model — local-first, cloud-synced**: every mutator in `UserContext` writes to
`localStorage` synchronously (for instant UI) and, if a Firebase user is signed in, fires an
async write to Firestore via [lib/firebase.js](lib/firebase.js) (`saveToCloud`/`getFromCloud`).
A `lastLocalUpdate` timestamp guards against a cloud refresh clobbering a very recent local edit
(see `refreshData` in UserContext). When editing any mutator, preserve this local-write-then-cloud-sync
order — don't await the cloud write before updating local state/UI.

**Live workout session engine**: the in-progress workout (`pages/routines/empty.js`, `pages/routines/[id].js`)
is driven by [hooks/useWorkoutSession.ts](hooks/useWorkoutSession.ts), a wrapper around the pure reducer
in [hooks/workoutSessionReducer.ts](hooks/workoutSessionReducer.ts). The reducer indexes every exercise/series
by a stable `uid` (not array index), so deleting/reordering series never desyncs state. Session snapshots
persist to `localStorage` via [lib/workoutStorage.ts](lib/workoutStorage.ts) under the key
`workoutSessionSnapshot` (intentionally separate from the legacy `workoutTimerState` key used by
not-yet-migrated screens — don't merge these without checking both call sites). [components/Layout.jsx](components/Layout.jsx)
reads that snapshot read-only to show a live elapsed-time pill for the active routine from anywhere in the app.

**Design tokens**: [lib/tokens.js](lib/tokens.js) exports `getTokens(isDark)` for normal screens and
`getWorkoutTokens()` for the always-dark "workout mode" screens (create/empty/[id] routines — these
three intentionally ignore the user's theme preference). Always derive colors from these instead of
hardcoding new hex values; the file's comments explain past hex-drift bugs this was built to prevent.

**Firebase**: client SDK in `lib/firebase.js` (Auth via Google popup, Firestore, Storage), guarded so
the app degrades gracefully if env vars are missing. Firebase Admin (`pages/api/generate-routine.js`,
`pages/api/chat.js`) verifies ID tokens server-side before calling OpenAI. Firestore security rules are
in [firestore.rules](firestore.rules); social/profile documents (`users/{uid}`, `usersPublic/{uid}`,
`workouts/{id}`) are readable by anyone but writable only by their owner (with a carve-out for
likes/comments on workouts and posts).

**Navigation**: the single source of truth for nav links is [data/navigation.js](data/navigation.js)
(`NAV_ITEMS`, `MOBILE_PRIMARY_KEYS`), consumed by both `Sidebar.jsx` (desktop) and `BottomNavigation.jsx`
(mobile). Add new top-level pages there, not by editing the sidebar/bottom-nav directly.

**i18n**: `data/translations.js` holds `es`/`eu` string tables; `UserContext`'s `t(key)` looks up the
current `language`. Nav labels and most user-facing strings go through translation keys, not literals.

**Styling convention**: inline `style={{...}}` objects sourced from `lib/tokens.js`, not CSS files or
Tailwind classes (Tailwind is installed but unused). This is a deliberate repo convention — follow it
for consistency rather than introducing a second styling system.

## Known inconsistencies to be aware of

- Mixed `.js`/`.jsx`/`.ts`/`.tsx` file extensions across `components/`, `hooks/`, and `lib/` reflect an
  in-progress TypeScript migration — see "Components & code" above for the policy (new files TS,
  don't force-migrate existing ones).
- `pages/api/chat.js` and `pages/api/generate-routine.js` call OpenAI directly from a Next.js API route
  using `OPENAI_API_KEY`/Firebase Admin env vars — these must be set in Vercel/deployment env, not just
  `.env.local`.
- `split.py`, `split_svg.py`, `split_frontrear.py` at the repo root are one-off local scripts for
  reformatting the muscle-map SVG/HTML assets under `public/` into a more readable line-per-tag form;
  they aren't part of the build and don't need maintaining.

## Reference docs

`docs/` holds short product notes: `DESIGN.md` (theme baseline, referenced above) and `PROJECT.md`
(one-line feature list). `FEATURES.md` and `ROADMAP.md` exist but are currently empty.
