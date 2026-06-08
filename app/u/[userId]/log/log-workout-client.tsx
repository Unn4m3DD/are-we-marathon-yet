"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { SessionCard } from "@/components/session-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate, todayIso } from "@/lib/dates";
import {
  completedSessionIds,
  flattenSessions,
  sessionEstimatedDurationMin,
} from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";
import {
  type WorkoutType,
  workoutTypeLabels,
  workoutTypeSchema,
} from "@/lib/training-schema";

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

      router.push(`/u/${userId}`);
    },
  });
  const [explicitSessionId, setExplicitSessionId] = useState<string | null>(
    initialSessionId
  );
  const [workoutType, setWorkoutType] = useState<WorkoutType>("easy");
  const [formError, setFormError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const handleSessionChange = (value: string) => {
    setExplicitSessionId(value || null);
    setFormVersion((prev) => prev + 1);
  };

  const sessions = useMemo(
    () => (planQuery.data ? flattenSessions(planQuery.data) : []),
    [planQuery.data]
  );
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const completed = useMemo(() => completedSessionIds(logs), [logs]);
  const autoSessionId = useMemo(() => {
    const today = todayIso();

    return (
      sessions.find(
        (session) =>
          session.date >= today &&
          !session.optional &&
          !completed.has(session.id)
      )?.id ??
      sessions.find(
        (session) => session.date >= today && !completed.has(session.id)
      )?.id ??
      ""
    );
  }, [completed, sessions]);
  const selectedId = explicitSessionId ?? autoSessionId;
  const selectedSession =
    sessions.find((session) => session.id === selectedId) ?? null;
  const formDefaults = useMemo(() => {
    if (!selectedSession) {
      const defaults = {
        date: todayIso(),
        type: "easy" as WorkoutType,
        distanceKm: "",
        durationMin: "",
        perceivedEffort: "",
        notes: "",
      };
      setWorkoutType(defaults.type);
      return defaults;
    }

    const existingLog = logs.find(
      (log) => log.plannedSessionId === selectedSession.id
    );
    const type = existingLog?.type ?? selectedSession.type;
    setWorkoutType(type);

    return {
      date: existingLog?.date ?? selectedSession.date,
      type,
      distanceKm: numberField(
        existingLog?.distanceKm ?? selectedSession.distanceKm
      ),
      durationMin: numberField(
        existingLog?.durationMin ?? sessionEstimatedDurationMin(selectedSession)
      ),
      perceivedEffort: numberField(
        existingLog?.perceivedEffort ?? selectedSession.targetRpe
      ),
      notes: existingLog?.notes ?? "",
    };
  }, [logs, selectedSession]);

  function submit(formData: FormData) {
    setFormError(null);

    const parsedType = workoutTypeSchema.safeParse(workoutType);

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
    <div className="space-y-3 md:space-y-4">
      {loading ? (
        <div className="grid gap-3">
          <div className="h-44 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
          <div className="h-96 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Planned Workout
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Select value={selectedId} onValueChange={handleSessionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Custom / not from plan">
                      {selectedSession
                        ? `Week ${
                            selectedSession.weekNumber
                          } · ${formatReadableDate(selectedSession.date)} · ${
                            selectedSession.optional ? "Optional" : "Required"
                          } · ${workoutTypeLabels[selectedSession.type]}${
                            completed.has(selectedSession.id) ? " · logged" : ""
                          }`
                        : "Custom / not from plan"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Custom / not from plan</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        Week {session.weekNumber} ·{" "}
                        {formatReadableDate(session.date)} ·{" "}
                        {session.optional ? "Optional" : "Required"} ·{" "}
                        {workoutTypeLabels[session.type]}
                        {completed.has(session.id) ? " · logged" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSession ? (
                <SessionCard
                  session={selectedSession}
                  compact
                  bare
                  completed={completed.has(selectedSession.id)}
                />
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  Use this when you did a useful workout that was not in the
                  plan.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
            <form
              key={`${selectedId || "custom"}-${formVersion}`}
              className="space-y-4"
              action={submit}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="date"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Date
                  </Label>
                  <DatePickerField id="date" defaultValue={formDefaults.date} />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="type"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Type
                  </Label>
                  <Select
                    value={workoutType}
                    onValueChange={(value) =>
                      setWorkoutType(value as WorkoutType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {workoutTypeLabels[workoutType]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {workoutTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {workoutTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="distance"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Distance km
                  </Label>
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
                  <Label
                    htmlFor="duration"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Duration min
                  </Label>
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
                  <Label
                    htmlFor="rpe"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    RPE 1-10
                  </Label>
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
                <Label
                  htmlFor="notes"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={formDefaults.notes}
                  placeholder="Fueling, soreness, route, shoes, weather, mental notes..."
                />
              </div>

              {formError || createLog.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formError ?? createLog.error?.message}
                </p>
              ) : null}

              <div className="flex justify-center">
                <Button type="submit" disabled={createLog.isPending}>
                  <Save className="h-4 w-4" />
                  {createLog.isPending ? "Saving..." : "Save Workout"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
