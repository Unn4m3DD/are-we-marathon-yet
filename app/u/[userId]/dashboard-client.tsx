"use client";

import { CalendarClock, CheckCircle2, Flame, Route } from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";
import { SessionCard } from "@/components/session-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate, formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration, formatPaceAndSpeed } from "@/lib/pace";
import { completedSessionIds, weekEndsOn, weekRequiredDistanceKm } from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="rounded-md bg-cyan-50 p-2 text-cyan-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
          <p className="mt-1 text-sm text-zinc-600">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ userId }: { userId: string }) {
  const dashboard = trpc.dashboard.get.useQuery();

  if (dashboard.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-48 animate-pulse rounded-lg bg-zinc-200" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-28 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-28 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-28 animate-pulse rounded-lg bg-zinc-200" />
        </div>
      </div>
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-red-700">Could not load your training data.</p>
          <p className="mt-2 text-sm text-zinc-600">{dashboard.error?.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, currentWeek, workoutsLeft, nextSession, countdownDays, metrics } = dashboard.data;
  const done = completedSessionIds(dashboard.data.logs);
  const requiredLeft = workoutsLeft.filter((session) => !session.optional).length;
  const optionalLeft = workoutsLeft.filter((session) => session.optional).length;
  const currentWeekEndsOn = weekEndsOn(currentWeek);
  const currentWeekRequiredKm = weekRequiredDistanceKm(currentWeek);
  const weeklyCompletedKm = dashboard.data.logs
    .filter((log) => log.date >= currentWeek.startsOn && log.date <= currentWeekEndsOn)
    .reduce((sum, log) => sum + (log.distanceKm ?? 0), 0);
  const baselinePace = formatPaceAndSpeed(
    Math.round((plan.athleteBaseline.durationMin * 60) / plan.athleteBaseline.distanceKm),
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="required">Week {currentWeek.weekNumber} of {plan.weeks.length}</Badge>
              <Badge variant="default">{currentWeek.focus}</Badge>
              <Badge variant="muted">Race {formatLongDate(plan.race.date)}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">
              {currentWeek.notes ?? currentWeek.focus}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              Baseline: {plan.athleteBaseline.distanceKm} km in{" "}
              {formatDuration(plan.athleteBaseline.durationMin)} on{" "}
              {formatReadableDate(plan.athleteBaseline.date)} ({baselinePace}). Optional sessions are
              available when recovery is good.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href={nextSession ? `/u/${userId}/log?session=${nextSession.id}` : `/u/${userId}/log`}>
                Log Next Workout
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/u/${userId}/plan`}>View Plan</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Race Countdown"
          value={`${countdownDays} days`}
          detail={`${formatDistance(plan.race.distanceKm)} on ${formatReadableDate(plan.race.date)}`}
        />
        <StatCard
          icon={Route}
          label="This Week"
          value={`${weeklyCompletedKm.toFixed(1)} / ${currentWeekRequiredKm.toFixed(1)} km`}
          detail={`Required target, ${currentWeek.targetDistanceKm.toFixed(1)} km with options`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Required Left"
          value={`${requiredLeft}`}
          detail={`${optionalLeft} optional sessions still available`}
        />
        <StatCard
          icon={Flame}
          label="Logged Total"
          value={`${metrics.totalDistanceKm.toFixed(1)} km`}
          detail={`${metrics.requiredCompletionPercent}% required completion to date`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">Workouts Left This Week</h2>
              <p className="text-sm text-zinc-600">
                {formatReadableDate(currentWeek.startsOn)} to {formatReadableDate(currentWeekEndsOn)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/u/${userId}/log`}>Choose Workout</Link>
            </Button>
          </div>

          {workoutsLeft.length > 0 ? (
            <div className="grid gap-4">
              {workoutsLeft.map((session) => (
                <SessionCard key={session.id} session={session} userId={userId} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-5">
                <p className="font-medium text-zinc-950">No sessions left this week.</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Review metrics, recover, and keep the next week controlled.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Next Required Session</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <SessionCard
                  session={nextSession}
                  userId={userId}
                  compact
                  bare
                  completed={done.has(nextSession.id)}
                />
              ) : (
                <p className="text-sm text-zinc-600">All required sessions are logged.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preparation Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-zinc-700">
                <li>Use optional runs only when soreness, sleep, and stress are under control.</li>
                <li>Practice fuel and fluids on every long run from week one.</li>
                <li>Log RPE and notes so pace, speed, and fatigue trends stay visible.</li>
                <li>Drop intensity before volume if pain starts changing your gait.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700">
              <p>Total duration: {formatDuration(metrics.totalDurationMin)}</p>
              <p>Longest logged run: {metrics.longestRunKm.toFixed(1)} km</p>
              <p>
                Average logged pace/speed:{" "}
                {metrics.averagePaceSecPerKm ? formatPaceAndSpeed(metrics.averagePaceSecPerKm) : "No run logs yet"}
              </p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={`/u/${userId}/metrics`}>Open Metrics</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
