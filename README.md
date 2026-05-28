# Are We Marathon Yet

On-demand marathon readiness coach. No calendars, no schedules—just tell the app when you can run today and get a personalized workout recommendation based on your training history.

## Stack

- Next.js 15 (App Router, Static Export)
- TypeScript
- Tailwind CSS (dark mode via `prefers-color-scheme`)
- Drizzle ORM
- Turso/libSQL (local file: `local.db` for development)
- UUID-only identity (no passwords, no auth providers)

## Getting Started

```bash
# Install dependencies
npm install

# Generate and run migrations
npm run db:generate
npm run db:migrate

# Run dev server
npm run dev

# Build for production
npm run build
```

## How It Works

1. **Sign in** with a UUID or create a new account
2. **Set your availability** (min/max days per week) in Settings
3. **Tap "Tell me what to do"** when you want to run
4. **Complete the workout** and log your perceived effort (1-10)
5. **See readiness projections** update based on your training

The app never generates a future schedule. It only recommends workouts when you ask, using:
- Your weekly anchor structure (short + long runs minimum)
- Recent effort levels to determine recovery needs
- Progressive overload for long run distance

## Project Structure

```
app/
  page.tsx                 # Login/signup
  u/[userId]/
    page.tsx               # Dashboard
    history/page.tsx       # Run history with delete
    settings/page.tsx      # Min/max days, units
    workouts/recommendation/page.tsx  # Workout + completion
components/
  BottomNav.tsx            # Mobile nav
  ReadinessCard.tsx        # Marathon readiness visualization
lib/
  coach.ts                 # Recommendation algorithm
  coach.test.ts            # Algorithm tests
  types.ts                 # Shared types
  validation.ts            # UUID validation
  date.ts                  # Date formatting
db/
  schema.ts                # Drizzle schema
  index.ts                 # Database client
```

## Key Behaviors

- **No multiple runs per day**: Once you log a run, the dashboard shows "Run logged today"
- **Weekly anchors first**: If min days not met, you get required short/long runs before recovery
- **Effort-based adaptation**: High effort (9-10) triggers recovery, low effort (1-4) accelerates progression
- **Compact mobile UI**: Dense layout, bottom nav, system dark mode

## Tests

```bash
npm test
```

Core recommendation logic tests cover:
- First recommendation with no history
- Blocking when run already logged today
- Blocking when weekly max reached
- Anchor priority (short → long → optional)
- Recovery logic respecting weekly structure
- Long run progression rules