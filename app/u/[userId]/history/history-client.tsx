"use client";

import { Edit3, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration, formatPaceAndSpeed, secondsPerKmFromWorkout } from "@/lib/pace";
import { flattenSessions } from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";
import { type WorkoutLog, workoutTypeSchema } from "@/lib/training-schema";

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

function runSummary(log: WorkoutLog) {
  const pace = secondsPerKmFromWorkout(log.distanceKm, log.durationMin);

  return [
    formatDistance(log.distanceKm),
    formatDuration(log.durationMin),
    pace ? formatPaceAndSpeed(pace) : null,
    log.perceivedEffort ? `RPE ${log.perceivedEffort}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function HistoryClient() {
  const utils = trpc.useUtils();
  const logsQuery = trpc.workout.logs.useQuery();
  const planQuery = trpc.plan.get.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const updateLog = trpc.workout.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.workout.logs.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
      setEditingId(null);
    },
  });

  const sessionsById = useMemo(() => {
    const plan = planQuery.data;

    if (!plan) {
      return new Map();
    }

    return new Map(flattenSessions(plan).map((session) => [session.id, session]));
  }, [planQuery.data]);

  function submit(log: WorkoutLog, formData: FormData) {
    setFormError(null);

    const parsedType = workoutTypeSchema.safeParse(String(formData.get("type") ?? ""));

    if (!parsedType.success) {
      setFormError("Choose a valid workout type.");
      return;
    }

    updateLog.mutate({
      id: log.id,
      date: String(formData.get("date") ?? log.date),
      type: parsedType.data,
      distanceKm: numberOrNull(formData.get("distanceKm")),
      durationMin: numberOrNull(formData.get("durationMin")),
      perceivedEffort: effortOrNull(formData.get("perceivedEffort")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    });
  }

  const loading = logsQuery.isLoading || planQuery.isLoading;
  const logs = logsQuery.data ?? [];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Run History</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Review every logged run and fix the actual data when distance, duration, RPE, or notes change.
        </p>
      </div>

      {loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />
      ) : logsQuery.error ? (
        <Card>
          <CardContent className="p-5">
            <p className="font-medium text-red-700">Could not load run history.</p>
            <p className="mt-2 text-sm text-zinc-600">{logsQuery.error.message}</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="font-medium text-zinc-950">No runs logged yet.</p>
            <p className="mt-1 text-sm text-zinc-600">
              Once you log a workout, it will appear here for review and editing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {logs.map((log) => {
            const plannedSession = log.plannedSessionId ? sessionsById.get(log.plannedSessionId) : null;
            const editing = editingId === log.id;
            const summary = runSummary(log);

            return (
              <Card key={log.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={plannedSession?.optional ? "optional" : "required"}>
                        {plannedSession ? `Week ${plannedSession.weekNumber}` : "Manual run"}
                      </Badge>
                      <Badge variant="muted">{log.type}</Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {formatReadableDate(log.date)}
                      {plannedSession ? ` · ${plannedSession.title}` : ""}
                    </CardTitle>
                    <p className="text-sm text-zinc-600">{summary || "No distance or duration logged yet"}</p>
                  </div>
                  <Button
                    type="button"
                    variant={editing ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setEditingId(editing ? null : log.id);
                    }}
                  >
                    {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    {editing ? "Cancel" : "Edit"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <form className="grid gap-4" action={(formData) => submit(log, formData)}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`date-${log.id}`}>Date</Label>
                          <Input id={`date-${log.id}`} name="date" type="date" defaultValue={log.date} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`type-${log.id}`}>Type</Label>
                          <select
                            id={`type-${log.id}`}
                            name="type"
                            defaultValue={log.type}
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
                          <Label htmlFor={`distance-${log.id}`}>Distance km</Label>
                          <Input
                            id={`distance-${log.id}`}
                            name="distanceKm"
                            inputMode="decimal"
                            type="number"
                            min="0"
                            step="0.1"
                            defaultValue={numberField(log.distanceKm)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`duration-${log.id}`}>Duration min</Label>
                          <Input
                            id={`duration-${log.id}`}
                            name="durationMin"
                            inputMode="decimal"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={numberField(log.durationMin)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`rpe-${log.id}`}>RPE 1-10</Label>
                          <Input
                            id={`rpe-${log.id}`}
                            name="perceivedEffort"
                            inputMode="numeric"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            defaultValue={numberField(log.perceivedEffort)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${log.id}`}>Notes</Label>
                        <Textarea
                          id={`notes-${log.id}`}
                          name="notes"
                          defaultValue={log.notes ?? ""}
                          placeholder="Fueling, soreness, route, shoes, weather, mental notes..."
                        />
                      </div>

                      {formError || updateLog.error ? (
                        <p className="text-sm text-red-600">{formError ?? updateLog.error?.message}</p>
                      ) : null}

                      <Button type="submit" disabled={updateLog.isPending}>
                        <Save className="h-4 w-4" />
                        {updateLog.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  ) : (
                    <div className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-zinc-950">Planned:</span>{" "}
                        {plannedSession
                          ? `${plannedSession.day}, ${formatDistance(plannedSession.distanceKm)}`
                          : "Not linked to a planned session"}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-950">Logged:</span> {formatReadableDate(log.date)}
                      </p>
                      {log.notes ? <p className="sm:col-span-2">{log.notes}</p> : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
