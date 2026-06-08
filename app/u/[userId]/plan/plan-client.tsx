"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { WelcomeClient } from "@/app/u/[userId]/welcome-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration } from "@/lib/pace";
import {
  flattenSessions,
  sessionEstimatedDurationMin,
  weekEndsOn,
  weekRequiredDistanceKm,
} from "@/lib/plan-utils";
import { rpeToneClass } from "@/lib/rpe";
import { trpc } from "@/lib/trpc-client";
import {
  type TrainingPlan,
  type TrainingSession,
  trainingPlanSchema,
  workoutTypeLabels,
} from "@/lib/training-schema";
import { cn } from "@/lib/utils";

function SessionRow({ session }: { session: TrainingSession }) {
  const duration = sessionEstimatedDurationMin(session);

  return (
    <div className="grid gap-3 border-t border-zinc-200 py-3 first:border-t-0 dark:border-zinc-800 md:grid-cols-[5rem_1fr_auto]">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{session.day}</div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-zinc-950 dark:text-zinc-50">{workoutTypeLabels[session.type]}</h3>
          {session.optional ? <Badge variant="optional">Optional</Badge> : null}
        </div>
        {session.description ? (
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{session.description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {formatDistance(session.distanceKm) ? (
          <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-sm leading-none dark:bg-zinc-900 dark:text-zinc-100">
            {formatDistance(session.distanceKm)}
          </span>
        ) : null}
        {formatDuration(duration) ? (
          <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-sm leading-none dark:bg-zinc-900 dark:text-zinc-100">
            {formatDuration(duration)}
          </span>
        ) : null}
        <span
          className={cn(
            "inline-flex h-7 items-center rounded-md px-2.5 text-sm leading-none",
            rpeToneClass(session.targetRpe),
          )}
        >
          RPE {session.targetRpe}/10
        </span>
      </div>
    </div>
  );
}

export function PlanClient({ userId }: { userId: string }) {
  const planQuery = trpc.plan.get.useQuery();
  const sessionCount = useMemo(
    () => (planQuery.data ? flattenSessions(planQuery.data).length : 0),
    [planQuery.data],
  );

  if (planQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />;
  }

  if (planQuery.error) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-red-700">Could not load the training plan.</p>
          <p className="mt-2 text-sm text-zinc-600">{planQuery.error?.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!planQuery.data) {
    return <WelcomeClient userId={userId} />;
  }

  const plan = planQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Training Plan</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {plan.weeks.length} weeks · {sessionCount} sessions · race {formatReadableDate(plan.race.date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/u/${userId}/log`}>Log from Plan</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        {plan.weeks.map((week) => (
          <Card key={week.weekNumber}>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="default">Week {week.weekNumber}</Badge>
                  </div>
                  <CardTitle>{week.notes ?? `Week ${week.weekNumber}`}</CardTitle>
                  <CardDescription>
                    {formatReadableDate(week.startsOn)} to {formatReadableDate(weekEndsOn(week))}
                  </CardDescription>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 md:text-right">
                  <div>Required: {weekRequiredDistanceKm(week).toFixed(1)} km</div>
                  <div>With optional runs: {week.targetDistanceKm.toFixed(1)} km</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {week.sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <details className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer p-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Plan JSON
        </summary>
        <PlanJsonEditor plan={plan} />
      </details>
    </div>
  );
}

function PlanJsonEditor({ plan }: { plan: TrainingPlan }) {
  const utils = trpc.useUtils();
  const [json, setJson] = useState(() => JSON.stringify(plan, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const savePlan = trpc.plan.save.useMutation({
    onSuccess: async (savedPlan) => {
      setJson(JSON.stringify(savedPlan, null, 2));
      setJsonError("Saved.");
      await Promise.all([
        utils.plan.get.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
    },
  });

  function submitJson() {
    setJsonError(null);

    try {
      const parsed = trainingPlanSchema.parse(JSON.parse(json));
      savePlan.mutate({ plan: parsed });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Plan JSON is invalid.");
    }
  }

  return (
    <CardContent className="space-y-4">
      <Textarea
        className="min-h-[32rem] font-mono text-xs"
        value={json}
        onChange={(event) => {
          setJson(event.target.value);
          setJsonError(null);
        }}
        spellCheck={false}
      />
      {jsonError ? (
        <p className={jsonError === "Saved." ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
          {jsonError}
        </p>
      ) : null}
      <Button onClick={submitJson} disabled={savePlan.isPending}>
        <Save className="h-4 w-4" />
        {savePlan.isPending ? "Saving..." : "Save JSON"}
      </Button>
    </CardContent>
  );
}
