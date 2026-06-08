"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration } from "@/lib/pace";
import {
  flattenSessions,
  sessionDate,
  sessionEstimatedDurationMin,
  weekEndsOn,
  weekRequiredDistanceKm,
} from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";
import {
  type TrainingPlan,
  type TrainingSession,
  type TrainingWeek,
  trainingPlanSchema,
} from "@/lib/training-schema";

function SessionRow({ session, week }: { session: TrainingSession; week: TrainingWeek }) {
  const duration = sessionEstimatedDurationMin(session);

  return (
    <div className="grid gap-3 border-t border-zinc-200 py-4 first:border-t-0 md:grid-cols-[8rem_1fr_auto]">
      <div className="text-sm text-zinc-600">
        <div className="font-medium text-zinc-900">{session.day}</div>
        <div>{formatReadableDate(sessionDate(week, session))}</div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-zinc-950">{session.title}</h3>
          <Badge variant={session.optional ? "optional" : "required"}>
            {session.optional ? "Optional" : "Required"}
          </Badge>
          <Badge variant="muted">{session.type}</Badge>
        </div>
        {session.structure ? <p className="mt-1 text-sm text-zinc-700">{session.structure}</p> : null}
        {session.notes ? <p className="mt-1 text-sm text-zinc-600">{session.notes}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {formatDistance(session.distanceKm) ? (
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-sm">
            {formatDistance(session.distanceKm)}
          </span>
        ) : null}
        {formatDuration(duration) ? (
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-sm">
            {formatDuration(duration)}
          </span>
        ) : null}
        <span className="rounded-md bg-cyan-50 px-2 py-1 text-sm text-cyan-900">
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

  if (planQuery.error || !planQuery.data) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-red-700">Could not load the training plan.</p>
          <p className="mt-2 text-sm text-zinc-600">{planQuery.error?.message}</p>
        </CardContent>
      </Card>
    );
  }

  const plan = planQuery.data;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Training Plan</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {plan.weeks.length} weeks, {sessionCount} planned sessions, race day{" "}
            {formatReadableDate(plan.race.date)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/u/${userId}/plan/update`}>Update with ChatGPT</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/u/${userId}/log`}>Log from Plan</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Assumptions</CardTitle>
          <CardDescription>
            Baseline: {plan.athleteBaseline.distanceKm} km in{" "}
            {formatDuration(plan.athleteBaseline.durationMin)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm leading-6 text-zinc-700 md:grid-cols-2">
            <div className="rounded-md bg-zinc-50 p-3">
              Weekly distance progresses from {plan.progression.weeklyDistanceStartKm} km to{" "}
              {plan.progression.weeklyDistancePeakKm} km.
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              Long runs progress from {plan.progression.longRunStartKm} km to{" "}
              {plan.progression.longRunPeakKm} km.
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              Session intensity is prescribed by RPE instead of planned pace.
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        {plan.weeks.map((week) => (
          <Card key={week.weekNumber}>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="default">Week {week.weekNumber}</Badge>
                    <Badge variant="muted">{week.focus}</Badge>
                  </div>
                  <CardTitle>{week.notes ?? week.focus}</CardTitle>
                  <CardDescription>
                    {formatReadableDate(week.startsOn)} to {formatReadableDate(weekEndsOn(week))}
                  </CardDescription>
                </div>
                <div className="text-sm text-zinc-600 md:text-right">
                  <div>Required: {weekRequiredDistanceKm(week).toFixed(1)} km</div>
                  <div>With optional runs: {week.targetDistanceKm.toFixed(1)} km</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {week.sessions.map((session) => (
                <SessionRow key={session.id} session={session} week={week} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Plan JSON</CardTitle>
          <CardDescription>
            The app stores this as one validated JSON blob for this user and keeps a timestamped history.
          </CardDescription>
        </CardHeader>
        <PlanJsonEditor plan={plan} />
      </Card>
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
