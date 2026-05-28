# Knowledge Handover

This is a knowledge-only handover for rebuilding the app from scratch. Do not preserve the current implementation. The next agent should use this as the product brief, technical direction, and list of traps to avoid.

## Fresh-Agent Prompt

Use this as the single prompt to the next agent:

```text
Build a mobile-first marathon readiness web app from scratch. Read Handover.md fully first. The app is not a scheduled marathon training calendar: it is an on-demand coach. The user trains unpredictably, 2 to 6 days per week, and only asks for a workout when they decide they can run today. Use Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, Turso/libSQL, zod, and UUID-v4-only identity. Deploy target is Vercel with minimal dashboard configuration. Preserve the product behavior described in Handover.md and avoid the traps listed there. Verify with tests and a production build.
```

## Product Shape

Build an app called `Are We Marathon Yet`.

The core question the app answers is:

> I can run today. Given what I have actually done, what should I do today, and how close am I to being marathon-ready?

The app must not generate a fixed future plan. The user explicitly cannot follow scheduled training calendars because their life is unpredictable.

The app should feel like a personal training cockpit on a phone:

- Open the app.
- See whether a run is already logged today.
- See weekly minimum progress.
- If running today, tap `Tell me what to do`.
- Do the recommended workout.
- Log it with effort.
- See readiness projections update.

## Non-Negotiable Product Requirements

- No race date.
- No countdown to race day.
- No calendar of future planned workouts.
- No weekly schedule.
- No asking the user to pick long-run days.
- No gear tracking.
- No notes field.
- No "optional run" wording for the minimum weekly structure.
- No real auth provider.
- No heavyweight setup.

The user starts when they generate/save their readiness profile. They are ready when their logged training supports marathon distance.

## Training Model

The user is a beginner.

They want to finish a marathon comfortably eventually, roughly around 7/10 perceived effort, but the app should not ask them to define a race goal. Instead, the app should visualize estimated readiness at different effort levels.

The user can commit to:

- Minimum run days per week: 2 to 6.
- Maximum run days per week: 2 to 6.

The default should be:

- Minimum: 2 days/week.
- Maximum: 6 days/week.
- Distance unit: kilometers.

Weekly distance should be decided by the app. Do not ask the user for current weekly mileage.

The mental model for a 2-day minimum week is:

- One short/easy anchor run.
- One long run.

If both are complete, mark them finished. If one is missing, make it obvious which one is still needed.

For higher minimums, add more easy/steady/recovery structure, but the app should still clearly identify the week’s required work and never imply the user must follow a prewritten calendar.

## On-Demand Recommendation Rules

Recommendations are created only when the user taps `Tell me what to do`.

The app must check current state every time:

1. If the user already logged a run today, do not recommend another run.
2. If the user has reached their weekly maximum run count, do not recommend another run.
3. If the weekly minimum structure is incomplete, prioritize completing required weekly anchors.
4. If recovery is needed, recommend recovery only when it does not incorrectly override required weekly structure.
5. Otherwise recommend the best useful run from recent history.

Important: "I ran yesterday" should not automatically beat "I still need my long run this week" when the weekly model says the long run is the next required anchor and the user has chosen to run today.

The app should not create multiple recommendations for the same day. If a same-day recommendation exists and inputs changed, recompute/replace it instead of reusing stale data.

The app should not allow multiple run logs for the same day. Once a run is logged today, the dashboard should say the run is logged and stop offering more.

## Suggested Recommendation Logic

Keep this simple and rule-based for MVP.

Use recent run logs only. Avoid future planned workouts.

Useful derived values:

- Current week logs, with week starting Monday.
- Runs logged today.
- Current week run count.
- Recent 28-day distance.
- Recent average weekly distance.
- Longest historical run.
- Current long-run target.
- Whether this week has a short anchor.
- Whether this week has a long anchor.

Suggested defaults:

- Minimum weekly training floor: 12 km/week for calculations, even with no history.
- First short/easy run: around 3 km.
- Initial long-run target: 6 km.
- Long-run target progression: longest run + about 1.5 km, capped around 34 km.
- Easy/recovery distances should stay conservative for a beginner.
- Duration can be prefilled from a simple pace estimate, e.g. 7 min/km, until real pace modeling exists.

Recommendation priority for `min=2/max=2`:

- No runs this week:
  - Recommend the short/easy anchor unless recent hard effort makes a recovery-labeled short run more appropriate.
- One short run this week, no long run:
  - Recommend the long run.
- Long run done but no short run:
  - Recommend the short/easy anchor if weekly max allows.
- Two runs this week:
  - Do not recommend more.

Avoid this bad behavior:

- User has `min=2/max=2`.
- User has logged one 3 km run this week.
- User taps `Tell me what to do`.
- App recommends `Recovery run` or `Optional run`.

Correct behavior:

- Recommend the required long run.

## Readiness Visualization

The app should show estimated marathon readiness, not a race plan.

Show milestones for:

- 10/10 effort: finish-ready but hard.
- 9/10 effort: stronger finish.
- 8/10 effort: controlled finish.
- 7/10 effort: comfort-ready.

Suggested target thresholds:

- 10/10: about 42 km/week and 28 km long run.
- 9/10: about 48 km/week and 30 km long run.
- 8/10: about 54 km/week and 32 km long run.
- 7/10: about 60 km/week and 34 km long run.

Projection can be simple:

- Estimate current weekly distance from recent logs.
- Estimate current long-run ability from longest logged run.
- Estimate weeks needed by the larger gap:
  - weekly distance gap / 3 km per week.
  - long-run gap / 1.5 km per week.

UX trap: do not show unexplained numbers like `42 km/week` and `28 km long` in a row without labels. The user explicitly found that confusing.

Prefer a compact visualization:

- Effort level.
- Plain label.
- Estimated date.
- Days away.
- Small progress visual.
- Short explanation of what the curve means.

Avoid bloated readiness cards.

## Logging UX

When the user opens a recommended workout:

- Pre-fill date.
- Pre-fill distance.
- Pre-fill duration.
- Leave perceived effort empty.
- Require perceived effort before saving.

Remove notes entirely:

- No notes input.
- No notes column in DB.
- No notes display.

History must allow deleting entries.

Deletion must use a confirmation modal, not immediate deletion.

Deleting a run should update dashboard progress and readiness.

## Required Pages

Keep the app small.

Pages:

- `/`
  - UUID sign-in/sign-up.
- `/u/[userId]`
  - Today/dashboard.
- `/u/[userId]/workouts/[workoutId]`
  - Recommended workout detail and completion form.
- `/u/[userId]/history`
  - Run history.
- `/u/[userId]/settings`
  - Availability and distance unit.

The previous app used `/log`, but the product language should be `History`. Prefer `/history` in a rebuild.

Do not build:

- Calendar page.
- Gear page.
- Race setup page.

## Dashboard UX

The dashboard should prioritize:

1. Today state:
   - Already logged today.
   - Weekly limit reached.
   - Or `Training today?` with `Tell me what to do`.
2. Runs this week:
   - Required anchors.
   - Finished/missing state.
3. Readiness visualization.
4. Basic stats:
   - This week distance.
   - Recent average.
   - Longest run.
5. Recent runs.

Keep spacing tight on mobile. The user complained about large visual gaps.

Use cards for meaningful grouped items only. Do not nest cards inside cards.

Use bottom navigation:

- Today
- History
- Settings

## Settings UX

Settings must actually affect recommendations.

Fields:

- Minimum run days per week.
- Maximum run days per week.
- Distance unit.

Requirements:

- Minimum cannot exceed maximum.
- Maximum cannot be below minimum.
- The UI should handle changing both values cleanly.
- Saving settings should invalidate/recompute any stale recommendation.

Avoid a button called `Generate readiness plan`. The user found that confusing because the product should not generate a plan.

Suggested button text:

- `Save coaching settings`

Suggested explanatory copy:

- "No future schedule is created. When you decide to run, the app chooses today's workout from your history and weekly availability."

## Auth Model

Use UUID-v4-only identity.

This is intentionally not secure authentication.

Behavior:

- Login page has UUID input.
- `Sign in` validates UUID v4 and routes to `/u/[userId]`.
- `Sign up` generates a UUID v4, creates the user, stores it locally, and routes to `/u/[userId]`.
- Store last UUID in `localStorage` for convenience.
- Server actions validate UUID v4 every time.
- UI must plainly say anyone with the UUID can access the data.

Do not add:

- Passwords.
- Email.
- OAuth.
- Sessions.
- Cookies.
- Clerk.
- NextAuth.
- Supabase auth.

## Suggested Database

Use Turso/libSQL with Drizzle.

Required env vars:

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Fallback for local development can be:

```ts
process.env.TURSO_DATABASE_URL ?? "file:local.db"
```

Suggested tables:

```text
users
- id text primary key
- created_at integer
- updated_at integer

athlete_profiles
- user_id text primary key references users.id
- start_date integer not null
- distance_unit text not null default 'km'
- min_run_days_per_week integer not null default 2
- max_run_days_per_week integer not null default 6
- experience_level text not null default 'beginner'
- created_at integer
- updated_at integer

coach_states or training_contexts, optional
- user_id text primary key references users.id
- any derived/cache fields only if truly needed
- created_at integer
- updated_at integer

workouts
- id text primary key
- user_id text references users.id
- scheduled_date integer not null
- type text not null
- title text not null
- description text not null
- planned_distance real
- planned_duration_seconds integer
- planned_intensity text
- status text not null
- created_at integer
- updated_at integer

run_logs
- id text primary key
- user_id text references users.id
- workout_id text nullable references workouts.id
- date integer not null
- distance real not null
- duration_seconds integer nullable
- perceived_effort integer nullable
- completed integer not null default true
- created_at integer
- updated_at integer
```

You do not need a `training_plans` table for a clean rebuild unless you want an audit grouping for recommendations. If you add one, call it something on-demand like `coach_sessions` or `recommendation_batches`; do not model future plans.

Do not create:

- `gear`
- `gear_usage`
- `notes`
- `race_date`
- `long_run_weekday`
- `run_days_per_week` as a fixed schedule value

## Stack Constraints

Use:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Drizzle ORM.
- Turso/libSQL.
- zod.
- uuid.
- lucide-react.
- Vitest for core logic tests.

Do not use:

- Prisma.
- Supabase.
- Clerk.
- NextAuth.
- A heavyweight UI kit.

Deployment target:

- Vercel.
- Minimal dashboard configuration: connect repo, add Turso env vars, deploy.
- Migrations should be run intentionally, not automatically during normal page requests.

## Mobile UI Direction

This is primarily a phone app.

Design rules:

- Mobile-first layout.
- Dense but readable.
- Thumb-friendly controls.
- Large tap targets.
- Bottom navigation.
- System dark mode.
- No landing-page marketing experience after login.
- No hero art needed.
- Avoid decorative gradients/orbs.
- Avoid huge cards and large empty gaps.
- Keep labels plain and short.

Use icons where useful:

- Bottom nav.
- Delete button.
- Completed/missing states.

Use confirmation modal for destructive actions.

## Dark Mode

Use system default:

```css
@media (prefers-color-scheme: dark) {
  ...
}
```

Trap: if you hard-code many arbitrary Tailwind colors, dark mode becomes annoying. Prefer CSS variables or a small semantic color system from the start.

## Implementation Traps Already Encountered

### Trap 1: Building A Scheduled Plan

The first instinct was to build a marathon calendar with planned future workouts. That is wrong for this user.

Correct model:

- On-demand recommendation only.
- No future schedule.
- No calendar.
- No race date.

### Trap 2: Treating Long-Run Day As A Preference

The user does not want to choose a long-run weekday. Long runs happen whenever the app decides they make sense and the user chooses to train.

Correct model:

- Long run is a weekly anchor, not a weekday slot.

### Trap 3: "Optional" Runs

The user hated getting an optional run when required weekly runs were incomplete.

Correct model:

- If min weekly structure is incomplete, show what is required.
- Do not label it optional.

### Trap 4: Recovery Overrode Required Structure

Bad behavior:

- `min=2/max=2`.
- One short run logged this week.
- App recommends recovery because the last run was recent.

Correct behavior:

- Recommend the long run, because it is the second required weekly anchor.

Recovery logic must be aware of weekly requirements. Recent effort matters, but it should not randomly violate the user's stated availability model.

### Trap 5: Stale Same-Day Recommendations

If a recommendation is created and then settings or logic change, reusing the old row produces nonsense.

Correct model:

- On every `Tell me what to do`, recompute from current DB state.
- If a same-day uncompleted recommendation exists, update/replace it.

### Trap 6: Allowing Multiple Runs Per Day

The app previously allowed multiple submissions per day.

Correct model:

- Once a run is logged for the day, dashboard says so.
- Recommendation button disappears.
- Server action also enforces it.

### Trap 7: Readiness Numbers Without Meaning

The user saw rows with values like `42 km / week`, `28 km long`, and `projected` and did not understand them.

Correct model:

- Label every number.
- Prefer dates, days away, and a clear visual.
- Keep detailed thresholds secondary.

### Trap 8: Bloated Readiness Visualization

The user said the readiness curve was too bloated and visually bad.

Correct model:

- Compact rows.
- Small bars.
- Clear labels.
- No giant repeated cards.

### Trap 9: Gear And Notes

Gear and notes were in the original generic marathon plan but the user explicitly rejected them.

Correct model:

- No gear page.
- No gear DB tables.
- No notes field.

### Trap 10: Settings That Do Not Affect Coaching

The user noticed min/max settings did not change recommendations.

Correct model:

- Recommendation logic must directly use min/max days.
- Tests must cover min/max behavior.

### Trap 11: Week Boundary And Timezone Confusion

The user is in Europe/Lisbon. SQLite UTC displays can make local midnight appear as the previous day at 23:00.

Correct model:

- Use app-local day boundaries for today.
- Use Monday as week start.
- Be careful when debugging raw timestamps.

### Trap 12: Distance Unit Half-Implementation

Saving `km`/`mi` without consistently converting/displaying is confusing.

Correct model:

- Either implement unit conversion everywhere, or keep MVP km-only.
- Since the user is in Portugal/Lisbon, km default is fine.

## Tests To Require

At minimum, write unit tests for recommendation logic:

- First recommendation with no history is a short/easy beginner run.
- A run logged today blocks another recommendation.
- Weekly max reached blocks another recommendation.
- `min=2/max=2`, no runs this week -> short/easy anchor.
- `min=2/max=2`, one short run this week -> long run.
- `min=2/max=2`, short and long done -> no recommendation.
- Hard recent effort triggers recovery only when it does not violate required weekly anchor logic.
- Long-run target starts at 6 km.
- Long-run target progresses conservatively.
- Readiness projections order 10/10 before 9/10 before 8/10 before 7/10, or at least never make comfort-ready easier than finish-ready.

Integration/server tests if practical:

- Sign-up creates a UUID user.
- Sign-in rejects invalid UUIDs.
- Saving settings affects the next recommendation.
- Completing a workout creates exactly one run log.
- Completing a second run on same day is rejected/redirected.
- Deleting a run updates weekly anchor state.

Acceptance checks:

- Login fits on a phone viewport.
- Dashboard fits around 390px wide.
- Completion form has no overflow.
- Bottom nav stays reachable.
- Dark mode is legible.

## Final Product Summary

Build a mobile-first on-demand marathon readiness coach.

The app should never tell the user what they will do next week. It should wait until the user says they can train today, inspect actual history, and give one sensible workout for today.

The weekly structure exists only as a progress guardrail, not a schedule.

