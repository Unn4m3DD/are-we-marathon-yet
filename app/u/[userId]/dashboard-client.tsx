"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatReadableDate, todayIso } from "@/lib/dates";
import { formatDistance } from "@/lib/pace";
import { type PlannedSessionView, weekEndsOn, weekRequiredDistanceKm } from "@/lib/plan-utils";
import { rpeToneClass } from "@/lib/rpe";
import { trpc } from "@/lib/trpc-client";
import { workoutTypeLabels } from "@/lib/training-schema";
import { cn } from "@/lib/utils";

function MetricPill({
  children,
  tone = "muted",
  rpe,
}: {
  children: React.ReactNode;
  tone?: "muted" | "rpe";
  rpe?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2.5 text-sm leading-none",
        tone === "rpe"
          ? rpeToneClass(rpe)
          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
      )}
    >
      {children}
    </span>
  );
}

function CompactSessionRow({ session, userId }: { session: PlannedSessionView; userId: string }) {
  const controls = (
    <>
      <MetricPill>{formatDistance(session.distanceKm)}</MetricPill>
      <MetricPill tone="rpe" rpe={session.targetRpe}>
        RPE {session.targetRpe}/10
      </MetricPill>
      <Link
        href={`/u/${userId}/log?session=${session.id}`}
        className="inline-flex h-7 items-center rounded-md border border-zinc-300 bg-white px-2.5 text-sm font-medium leading-none text-zinc-950 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Log
      </Link>
    </>
  );

  return (
    <div className="border-t border-zinc-200 py-3 first:border-t-0 dark:border-zinc-800">
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-start md:grid-cols-[3rem_minmax(0,1fr)_auto] md:items-center">
        <div className="pt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">{session.day}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">{workoutTypeLabels[session.type]}</p>
            {session.optional ? <Badge variant="optional">Optional</Badge> : null}
          </div>
          {session.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400 md:truncate">
              {session.description}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 md:col-start-auto md:mt-0 md:flex-nowrap",
            "col-start-2 mt-2",
          )}
        >
          {controls}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ userId }: { userId: string }) {
  const dashboard = trpc.dashboard.get.useQuery();

  if (dashboard.isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-44 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
        <div className="h-56 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
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

  const { plan, currentWeek, workoutsLeft, nextSession } = dashboard.data;
  const requiredLeft = workoutsLeft.filter((session) => !session.optional).length;
  const optionalLeft = workoutsLeft.filter((session) => session.optional).length;
  const currentWeekEndsOn = weekEndsOn(currentWeek);
  const currentWeekRequiredKm = weekRequiredDistanceKm(currentWeek);
  const weeklyCompletedKm = dashboard.data.logs
    .filter((log) => log.date >= currentWeek.startsOn && log.date <= currentWeekEndsOn)
    .reduce((sum, log) => sum + (log.distanceKm ?? 0), 0);
  const today = todayIso();
  const todaySession = workoutsLeft.find((session) => session.date === today) ?? null;
  const actionSession = todaySession ?? nextSession;
  const requiredCompletedKm = Math.min(weeklyCompletedKm, currentWeekRequiredKm);
  const weekProgressPercent =
    currentWeekRequiredKm === 0 ? 0 : Math.min(100, (requiredCompletedKm / currentWeekRequiredKm) * 100);

  return (
    <div className="space-y-3 md:space-y-4">
      <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="required">Week {currentWeek.weekNumber} of {plan.weeks.length}</Badge>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatReadableDate(currentWeek.startsOn)} to {formatReadableDate(currentWeekEndsOn)}
          </span>
        </div>

        {actionSession ? (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="min-w-0">
              <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                {todaySession ? "Today" : "Next workout"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
                  {workoutTypeLabels[actionSession.type]}
                </h1>
                {actionSession.optional ? <Badge variant="optional">Optional</Badge> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <MetricPill>{actionSession.day}</MetricPill>
                <MetricPill>{formatDistance(actionSession.distanceKm)}</MetricPill>
                <MetricPill tone="rpe" rpe={actionSession.targetRpe}>
                  RPE {actionSession.targetRpe}/10
                </MetricPill>
              </div>
              {actionSession.description ? (
                <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {actionSession.description}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button asChild>
                <Link href={`/u/${userId}/log?session=${actionSession.id}`}>Log this run</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">This week</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
                No planned runs left
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Log a custom run if you still train today.
              </p>
            </div>
            <Button asChild className="w-full md:w-auto">
              <Link href={`/u/${userId}/log`}>Log custom run</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Week progress</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {weeklyCompletedKm.toFixed(1)} / {currentWeekRequiredKm.toFixed(1)} required km
            </p>
          </div>
          <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
            <p>{requiredLeft} required left</p>
            <p>{optionalLeft} optional left</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
          <div
            className="h-full rounded-full bg-cyan-700 dark:bg-cyan-500"
            style={{ width: `${weekProgressPercent}%` }}
          />
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Remaining runs</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/u/${userId}/plan`}>Full plan</Link>
          </Button>
        </div>
        {workoutsLeft.length > 0 ? (
          <div>
            {workoutsLeft.map((session) => (
              <CompactSessionRow key={session.id} session={session} userId={userId} />
            ))}
          </div>
        ) : (
          <p className="py-3 text-sm text-zinc-600 dark:text-zinc-400">No planned runs left this week.</p>
        )}
      </section>
    </div>
  );
}
