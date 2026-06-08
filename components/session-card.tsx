import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration } from "@/lib/pace";
import { sessionEstimatedDurationMin } from "@/lib/plan-utils";
import type { TrainingSession } from "@/lib/training-schema";
import { cn } from "@/lib/utils";

type SessionView = TrainingSession & {
  date: string;
  weekNumber: number;
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
  const content = (
    <>
      <div className={cn("space-y-3", compact ? "p-4" : "p-5", bare && "p-0")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={session.optional ? "optional" : "required"}>
                {session.optional ? "Optional" : "Required"}
              </Badge>
              {completed ? <Badge variant="success">Logged</Badge> : null}
              <Badge variant="muted">{session.type}</Badge>
            </div>
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatReadableDate(session.date)} · Week {session.weekNumber}
            </p>
          </div>
          {userId ? (
            <Button asChild size="sm" variant={completed ? "outline" : "default"}>
              <Link href={`/u/${userId}/log?session=${session.id}`}>
                {completed ? "Edit Log" : "Log"}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className={cn("space-y-3", compact ? "p-4 pt-0" : "p-5 pt-0", bare && "p-0 pt-3")}>
        <div className="flex flex-wrap gap-2 text-sm">
          {distance ? <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{distance}</span> : null}
          {duration ? <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{duration}</span> : null}
          <span className="rounded-md bg-cyan-50 px-2 py-1 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
            RPE {session.targetRpe}/10
          </span>
          {session.optional ? (
            <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">Optional</span>
          ) : null}
        </div>
        {!compact ? (
          <>
            {session.structure ? (
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{session.structure}</p>
            ) : null}
            {session.notes ? <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{session.notes}</p> : null}
          </>
        ) : null}
      </div>
    </>
  );

  if (bare) {
    return (
      <div
        className={cn(
          "rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900",
          completed && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Card className={cn(completed && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30")}>
      {content}
    </Card>
  );
}
