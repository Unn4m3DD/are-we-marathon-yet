-- Initial migration for FLS-based schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS athlete_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    distance_unit TEXT NOT NULL DEFAULT 'km',
    min_run_days_per_week INTEGER NOT NULL DEFAULT 2,
    max_run_days_per_week INTEGER NOT NULL DEFAULT 6,
    current_fls REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date INTEGER NOT NULL,
    distance REAL NOT NULL,
    duration_seconds INTEGER NOT NULL,
    perceived_effort INTEGER NOT NULL,
    fls_after_run REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
