import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration } from "@/lib/pace";
import { sessionEstimatedDurationMin } from "@/lib/plan-utils";
import { rpeToneClass } from "@/lib/rpe";
import { type TrainingSession, workoutTypeLabels } from "@/lib/training-schema";
import { cn } from "@/lib/utils";

type SessionView = TrainingSession & {
  date: string;
  weekNumber: number;
  day: string;
};

export function SessionCard({
  session,
  userId,
  compact = false,
  completed = false,
  bare = false,
}: {
  session: SessionView;
  userId?: string;
  compact?: boolean;
  completed?: boolean;
  bare?: boolean;
}) {
  const distance = formatDistance(session.distanceKm);
  const duration = formatDuration(sessionEstimatedDurationMin(session));

  if (bare) {
    return (
      <div
        className={cn(
          "rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900",
          completed && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
        )}
      >
        <div className="grid gap-3 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:items-center">
          <div className="pt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {session.day}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-zinc-950 dark:text-zinc-50">{workoutTypeLabels[session.type]}</p>
              {session.optional ? <Badge variant="optional">Optional</Badge> : null}
              {completed ? <Badge variant="success">Logged</Badge> : null}
            </div>
            {session.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400 md:truncate">
                {session.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {distance ? (
              <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-sm leading-none text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {distance}
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
      </div>
    );
  }

  // Fallback for non-bare usage (though this is mainly used in bare mode now)
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{workoutTypeLabels[session.type]}</h3>
              {session.optional ? <Badge variant="optional">Optional</Badge> : null}
              {completed ? <Badge variant="success">Logged</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <span>{formatReadableDate(session.date)} · Week {session.weekNumber}</span>
              {distance ? <span>{distance}</span> : null}
              {duration ? <span>{duration}</span> : null}
              <span className="text-cyan-800 dark:text-cyan-200">RPE {session.targetRpe}/10</span>
            </div>
          </div>
          {userId ? (
            <Button asChild size="sm" variant={completed ? "outline" : "default"}>
              <Link href={`/u/${userId}/log?session=${session.id}`}>
                {completed ? "Edit Log" : "Log"}
              </Link>
            </Button>
          ) : null}
        </div>
        {!compact && session.description ? (
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{session.description}</p>
        ) : null}
      </div>
    </div>
  );
}
