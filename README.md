# Are We Marathon Yet

A Next.js marathon training app for a November 8, 2026 race.

## Stack

- Next.js App Router
- Tailwind CSS with local shadcn-style components
- tRPC endpoints
- React Query client state
- Turso/libSQL storage through Drizzle
- UUID-only dumb login

## Development

```bash
pnpm install
pnpm db:push
pnpm dev
```

Open `http://127.0.0.1:3000`.

## Database

By default, user plans and workout logs use a local libSQL database at `file:local.db`.

For Turso, set:

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Schema is defined in `server/schema.ts` and applied with Drizzle Kit:

```bash
pnpm db:push
```

Use `pnpm db:generate` if you want migration files from the Drizzle schema.

## Training Plan

The authored starter plan lives at `data/default-training-plan.json` and is validated with Zod before use. New users are seeded from that file, then their plan is stored per user in the database.

Every saved plan is also recorded in `training_plan_versions`, so plan changes over time can be reviewed per user. The ChatGPT update page builds a prompt from the active plan, run history, and manual feedback, then validates pasted replacement JSON before saving it.

The plan intentionally stores only stable authored intent:

- race and baseline
- simple progression anchors
- weeks with `startsOn`, `focus`, `targetDistanceKm`, and sessions
- running sessions with `day`, `type`, `optional`, title, distance, target RPE, and optional notes/structure

The app derives week end dates, session dates, weekly required distance, and metrics. Planned sessions use RPE rather than pace; logged runs can still show pace and speed from actual distance and duration. Strength and mobility are intentionally out of scope for this plan.

## Auth Model

The login page has one UUID input and two actions:

- `Sign In` uses the entered UUIDv4.
- `Sign Up` generates a new UUIDv4 and signs in with it.

User routes are scoped as `/u/$uuid/...`, and plan/log reads and writes use the active UUID from request context.

## Verification

```bash
pnpm validate:plan
pnpm lint
pnpm build
```
