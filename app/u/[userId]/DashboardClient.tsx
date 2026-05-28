'use client';

import { useRouter } from 'next/navigation';
import { format } from '@/lib/date';
import { BottomNav } from '@/components/BottomNav';
import { ReadinessCard } from '@/components/ReadinessCard';
import type { Run, AthleteProfile, Recommendation, ReadinessEstimate } from '@/lib/types';

interface DashboardClientProps {
  userId: string;
  profile: AthleteProfile;
  weeklyRuns: Run[];
  allRuns: Run[];
  ranToday: boolean;
  recommendation: Recommendation | null;
  readiness: ReadinessEstimate;
  longAnchorDone: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function DashboardClient({
  userId,
  profile,
  weeklyRuns,
  allRuns,
  ranToday,
  recommendation,
  readiness,
  longAnchorDone,
}: DashboardClientProps) {
  const router = useRouter();
  const weeklyDistance = weeklyRuns.reduce((s, r) => s + r.distance, 0);
  const longestRun = allRuns.length > 0 ? Math.max(...allRuns.map(r => r.distance)) : 0;

  const atMaxRuns = weeklyRuns.length >= profile.maxRunDaysPerWeek;
  const shortAnchorDone = weeklyRuns.length > 0;

  const getAnchorStatus = () => {
    if (weeklyRuns.length === 0) {
      return { text: 'Start your week', subtext: 'Log your first run to calculate FLS', color: 'text-amber-500' };
    }
    if (!longAnchorDone) {
      return { text: 'Long run needed', subtext: 'Your weekly long anchor', color: 'text-amber-500' };
    }
    return { text: 'Weekly structure complete', subtext: 'All anchors done', color: 'text-emerald-500' };
  };

  const anchorStatus = getAnchorStatus();

  const getRunTypeIcon = (type: string) => {
    switch (type) {
      case 'recovery': return '🐢';
      case 'easy': return '🏃';
      case 'steady': return '⚡';
      case 'long': return '🏔️';
      default: return '🏃';
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Today</h1>
        <p className="text-xs text-zinc-500">{format(new Date(), 'EEEE, MMM d')}</p>
      </header>

      <div className="p-4 space-y-4">
        {/* Today Status */}
        <section className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
          {ranToday ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Run logged today</p>
                <p className="text-sm text-zinc-500">Great work! Rest or cross-train.</p>
              </div>
            </div>
          ) : atMaxRuns ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Weekly maximum reached</p>
                <p className="text-sm text-zinc-500">Rest day. You&apos;ve earned it.</p>
              </div>
            </div>
          ) : recommendation ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg">
                    {getRunTypeIcon(recommendation.type)}
                  </div>
                  <div>
                    <p className="font-medium">Training today?</p>
                    <p className="text-sm text-zinc-500">{recommendation.reason}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/u/${userId}/workouts/recommendation`)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Tell me what to do
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">No run scheduled</p>
                <p className="text-sm text-zinc-500">Check back tomorrow.</p>
              </div>
            </div>
          )}
        </section>

        {/* Weekly Progress */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">This Week</h2>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Runs completed</span>
              <span className="text-sm font-medium">{weeklyRuns.length} / {profile.maxRunDaysPerWeek}</span>
            </div>
            <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (weeklyRuns.length / profile.maxRunDaysPerWeek) * 100)}%` }}
              />
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${anchorStatus.color}`}>{anchorStatus.text}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{anchorStatus.subtext}</p>
            </div>

            {shortAnchorDone && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Short run logged</span>
              </div>
            )}
            {longAnchorDone && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Long run complete</span>
              </div>
            )}
          </div>
        </section>

        {/* Readiness */}
        <ReadinessCard readiness={readiness} />

        {/* Quick Stats */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold">{weeklyDistance.toFixed(1)}</p>
              <p className="text-xs text-zinc-500">km this week</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold">{profile.currentFLS ?? '--'}</p>
              <p className="text-xs text-zinc-500">FLS</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold">{longestRun.toFixed(1)}</p>
              <p className="text-xs text-zinc-500">longest km</p>
            </div>
          </div>
        </section>

        {/* Recent Runs */}
        {allRuns.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Recent</h2>
            <div className="space-y-2">
              {allRuns.map(run => (
                <div
                  key={run.id}
                  className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{run.distance.toFixed(1)} km</p>
                    <p className="text-xs text-zinc-500">{format(run.date, 'MMM d')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatDuration(run.durationSeconds)}</p>
                    {run.perceivedEffort && (
                      <p className="text-xs text-zinc-500">Effort {run.perceivedEffort}/10</p>
                    )}
                    {run.flsAfterRun !== undefined && (
                      <p className="text-xs text-emerald-600">FLS {Math.round(run.flsAfterRun)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav userId={userId} active="today" />
    </main>
  );
}
