"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DatePickerField } from "@/components/date-picker-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate } from "@/lib/dates";
import {
  formatDistance,
  formatDuration,
  formatPaceAndSpeed,
  secondsPerKmFromWorkout,
} from "@/lib/pace";
import { flattenSessions, type PlannedSessionView } from "@/lib/plan-utils";
import { rpeToneClass } from "@/lib/rpe";
import {
  type WorkoutLog,
  workoutTypeLabels,
  workoutTypeSchema,
} from "@/lib/training-schema";
import { trpc } from "@/lib/trpc-client";
import { Edit3, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../../../lib/utils";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
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

  const deleteLog = trpc.workout.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.workout.logs.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
    },
  });

  const sessionsById = useMemo(() => {
    const plan = planQuery.data;

    if (!plan) {
      return new Map<string, PlannedSessionView>();
    }

    return new Map(
      flattenSessions(plan).map((session) => [session.id, session])
    );
  }, [planQuery.data]);

  function submit(log: WorkoutLog, formData: FormData) {
    setFormError(null);

    const parsedType = workoutTypeSchema.safeParse(
      String(formData.get("type") ?? "")
    );

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
    <div className="space-y-5">
      {loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />
      ) : logsQuery.error ? (
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4">
            <p className="font-medium text-red-700 dark:text-red-400">
              Could not load run history.
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {logsQuery.error.message}
            </p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">
              No runs logged yet.
            </p>
          </div>
        </div>
      ) : (
        <section className="space-y-3 md:space-y-4">
          {logs.map((log) => {
            const plannedSession = log.plannedSessionId
              ? sessionsById.get(log.plannedSessionId)
              : null;
            const editing = editingId === log.id;

            return (
              <div
                key={log.id}
                className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {editing ? (
                  <div className="p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Edit Workout
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormError(null);
                          setEditingId(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>

                    <form
                      className="space-y-4"
                      action={(formData) => submit(log, formData)}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`date-${log.id}`}
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            Date
                          </Label>
                          <DatePickerField
                            id={`date-${log.id}`}
                            defaultValue={log.date}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`type-${log.id}`}
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            Type
                          </Label>
                          <select
                            id={`type-${log.id}`}
                            name="type"
                            defaultValue={log.type}
                            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          >
                            {workoutTypes.map((type) => (
                              <option key={type} value={type}>
                                {workoutTypeLabels[type]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`distance-${log.id}`}
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            Distance km
                          </Label>
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
                          <Label
                            htmlFor={`duration-${log.id}`}
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            Duration min
                          </Label>
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
                          <Label
                            htmlFor={`rpe-${log.id}`}
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            RPE 1-10
                          </Label>
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
                        <Label
                          htmlFor={`notes-${log.id}`}
                          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Notes
                        </Label>
                        <Textarea
                          id={`notes-${log.id}`}
                          name="notes"
                          defaultValue={log.notes ?? ""}
                          placeholder="Fueling, soreness, route, shoes, weather, mental notes..."
                        />
                      </div>

                      {formError || updateLog.error ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {formError ?? updateLog.error?.message}
                        </p>
                      ) : null}

                      <div className="flex justify-center">
                        <Button type="submit" disabled={updateLog.isPending}>
                          <Save className="h-4 w-4" />
                          {updateLog.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="p-3 sm:p-4">
                    <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                      <div className="pt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatReadableDate(log.date).split(",")[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">
                            {workoutTypeLabels[log.type]}
                          </p>
                          {plannedSession ? (
                            <Badge
                              variant={
                                plannedSession.optional
                                  ? "optional"
                                  : "required"
                              }
                            >
                              Week {plannedSession.weekNumber}
                            </Badge>
                          ) : (
                            <Badge variant="muted">Manual</Badge>
                          )}
                        </div>
                        {log.notes ? (
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400 md:truncate">
                            {log.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {log.distanceKm ? (
                          <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-sm leading-none text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                            {formatDistance(log.distanceKm)}
                          </span>
                        ) : null}
                        {log.durationMin ? (
                          <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-sm leading-none text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                            {formatDuration(log.durationMin)}
                          </span>
                        ) : null}
                        {log.perceivedEffort ? (
                          <span
                            className={cn(
                              "inline-flex h-7 items-center rounded-md px-2.5 text-sm leading-none",
                              rpeToneClass(log.perceivedEffort)
                            )}
                          >
                            RPE {log.perceivedEffort}/10
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormError(null);
                            setEditingId(log.id);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog
                          open={deleteDialogOpen && workoutToDelete === log.id}
                          onOpenChange={(open) => {
                            setDeleteDialogOpen(open);
                            if (!open) setWorkoutToDelete(null);
                          }}
                        >
                          <AlertDialogTrigger>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWorkoutToDelete(log.id);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleteLog.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Workout
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this workout
                                from {formatReadableDate(log.date)}? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteLog.mutate({ id: log.id });
                                }}
                                disabled={deleteLog.isPending}
                              >
                                {deleteLog.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
