"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SessionCard } from "@/components/session-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate, todayIso } from "@/lib/dates";
import { completedSessionIds, flattenSessions, sessionEstimatedDurationMin } from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";
import { type WorkoutType, workoutTypeSchema } from "@/lib/training-schema";
import { cn } from "@/lib/utils";

const workoutTypes = workoutTypeSchema.options;

function numberField(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function numberOrNull(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue === "" ? null : Number(stringValue);
}

function effortOrNull(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue === "" ? null : Number.parseInt(stringValue, 10);
}

export function LogWorkoutClient({
  userId,
  initialSessionId,
}: {
  userId: string;
  initialSessionId: string | null;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const planQuery = trpc.plan.get.useQuery();
  const logsQuery = trpc.workout.logs.useQuery();
  const createLog = trpc.workout.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
        utils.workout.logs.invalidate(),
      ]);

      if (addMultiple) {
        setExplicitSessionId("");
        setFormVersion((version) => version + 1);
        return;
      }

      router.push(`/u/${userId}`);
    },
  });
  const [explicitSessionId, setExplicitSessionId] = useState<string | null>(initialSessionId);
  const [addMultiple, setAddMultiple] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const sessions = useMemo(
    () => (planQuery.data ? flattenSessions(planQuery.data) : []),
    [planQuery.data],
  );
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const completed = useMemo(() => completedSessionIds(logs), [logs]);
  const autoSessionId = useMemo(() => {
    const today = todayIso();

    return (
      sessions.find((session) => session.date >= today && !session.optional && !completed.has(session.id))
        ?.id ??
      sessions.find((session) => session.date >= today && !completed.has(session.id))?.id ??
      ""
    );
  }, [completed, sessions]);
  const selectedId = explicitSessionId ?? autoSessionId;
  const selectedSession = sessions.find((session) => session.id === selectedId) ?? null;
  const formDefaults = useMemo(() => {
    if (!selectedSession) {
      return {
        date: todayIso(),
        type: "easy" as WorkoutType,
        distanceKm: "",
        durationMin: "",
        perceivedEffort: "",
        notes: "",
      };
    }

    const existingLog = logs.find((log) => log.plannedSessionId === selectedSession.id);

    return {
      date: existingLog?.date ?? selectedSession.date,
      type: existingLog?.type ?? selectedSession.type,
      distanceKm: numberField(existingLog?.distanceKm ?? selectedSession.distanceKm),
      durationMin: numberField(existingLog?.durationMin ?? sessionEstimatedDurationMin(selectedSession)),
      perceivedEffort: numberField(existingLog?.perceivedEffort ?? selectedSession.targetRpe),
      notes: existingLog?.notes ?? "",
    };
  }, [logs, selectedSession]);

  function submit(formData: FormData) {
    setFormError(null);

    const parsedType = workoutTypeSchema.safeParse(String(formData.get("type") ?? ""));

    if (!parsedType.success) {
      setFormError("Choose a valid workout type.");
      return;
    }

    createLog.mutate({
      plannedSessionId: selectedId || null,
      date: String(formData.get("date") ?? todayIso()),
      type: parsedType.data,
      distanceKm: numberOrNull(formData.get("distanceKm")),
      durationMin: numberOrNull(formData.get("durationMin")),
      perceivedEffort: effortOrNull(formData.get("perceivedEffort")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    });
  }

  const loading = planQuery.isLoading || logsQuery.isLoading;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Log Workout</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose a planned session to pre-fill the log, then adjust the actual workout data.
        </p>
      </div>

      {loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Planned Workout</CardTitle>
                <CardDescription>Pick any planned session, including optional work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <select
                    id="session"
                    value={selectedId}
                    onChange={(event) => setExplicitSessionId(event.target.value)}
                    className={cn(
                      "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                      "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50",
                    )}
                  >
                    <option value="">Custom / not from plan</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        Week {session.weekNumber} · {formatReadableDate(session.date)} ·{" "}
                        {session.optional ? "Optional" : "Required"} · {session.title}
                        {completed.has(session.id) ? " · logged" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSession ? (
                  <SessionCard
                    session={selectedSession}
                    compact
                    bare
                    completed={completed.has(selectedSession.id)}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
                    Use this when you did a useful workout that was not in the plan.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Actual Workout</CardTitle>
                    <CardDescription>Everything here is editable before saving.</CardDescription>
                  </div>
                  {selectedSession ? (
                    <Badge variant={completed.has(selectedSession.id) ? "success" : "required"}>
                      {completed.has(selectedSession.id) ? "Editing log" : "New log"}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <form
                  key={`${selectedId || "custom"}-${formVersion}`}
                  className="grid gap-4"
                  action={submit}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" name="date" type="date" defaultValue={formDefaults.date} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <select
                        id="type"
                        name="type"
                        defaultValue={formDefaults.type}
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {workoutTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="distance">Distance km</Label>
                      <Input
                        id="distance"
                        name="distanceKm"
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={formDefaults.distanceKm}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration min</Label>
                      <Input
                        id="duration"
                        name="durationMin"
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={formDefaults.durationMin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rpe">RPE 1-10</Label>
                      <Input
                        id="rpe"
                        name="perceivedEffort"
                        inputMode="numeric"
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        defaultValue={formDefaults.perceivedEffort}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={formDefaults.notes}
                      placeholder="Fueling, soreness, route, shoes, weather, mental notes..."
                    />
                  </div>

                  {formError || createLog.error ? (
                    <p className="text-sm text-red-600">{formError ?? createLog.error?.message}</p>
                  ) : null}

                  <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={addMultiple}
                      onChange={(event) => setAddMultiple(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-cyan-700"
                    />
                    <span>
                      <span className="block font-medium text-zinc-950">Add multiple</span>
                      <span className="block text-zinc-600">
                        Stay on this page and reset the form after saving.
                      </span>
                    </span>
                  </label>

                  <Button type="submit" disabled={createLog.isPending}>
                    <Save className="h-4 w-4" />
                    {createLog.isPending ? "Saving..." : "Save Workout"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
