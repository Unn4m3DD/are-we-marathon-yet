# Are We Marathon Yet?

A fitness tracking app that calculates your readiness to run a marathon using a Fitness Level Score (FLS).

## How it works

The FLS (0-100) is calculated from every run you log:
- **Distance** - how far you ran
- **Time** - how long it took  
- **Effort** - how it felt (1-10)

This single number drives all recommendations:
- Base pace: `7:00 - (FLS × 1.8s)` per km
- Comfortable distance: `3km + (FLS × 0.15)`
- Long run target: scales with FLS up to 34km
- Marathon timeline: FLS 80+ = marathon ready

## Local Development

```bash
# Install dependencies
npm install

# Set up local database
npm run db:push

# Run dev server
npm run dev
```

## Deployment (Vercel + Turso)

### 1. Create Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create are-we-marathon-yet

# Get connection URL
turso db show are-we-marathon-yet
```

### 2. Run Migrations on Turso

```bash
# Set environment variable
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"

# Push schema
npm run db:push
```

### 3. Configure Vercel

Add environment variables in Vercel dashboard:
- `TURSO_DATABASE_URL` - Connection URL from Turso
- `TURSO_AUTH_TOKEN` - Auth token from Turso

### 4. Deploy

```bash
vercel --prod
```

## Database Migrations

For local development:
```bash
npm run db:push      # Push schema changes to local DB
```

For production (Turso):
```bash
# Set env vars first, then:
npm run db:push
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database URL | Production |
| `TURSO_AUTH_TOKEN` | Turso auth token | Production |

Local development uses `file:local.db` automatically.
