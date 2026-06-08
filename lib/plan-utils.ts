import { addDays, daysBetween, isWithin, todayIso } from "@/lib/dates";
import {
  type TrainingPlan,
  type TrainingSession,
  type TrainingWeek,
  type WorkoutLog,
} from "@/lib/training-schema";
import { secondsPerKmFromWorkout } from "@/lib/pace";

export type PlannedSessionView = TrainingSession & {
  weekNumber: number;
  date: string;
};

const dayOffsets: Record<TrainingSession["day"], number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function weekEndsOn(week: TrainingWeek) {
  return addDays(week.startsOn, 6);
}

export function sessionDate(week: TrainingWeek, session: TrainingSession) {
  return addDays(week.startsOn, dayOffsets[session.day]);
}

export function sessionWeek(plan: TrainingPlan, sessionId: string) {
  return plan.weeks.find((week) => week.sessions.some((session) => session.id === sessionId)) ?? null;
}

export function sessionEstimatedDurationMin(_session: TrainingSession) {
  return null;
}

export function weekRequiredDistanceKm(week: TrainingWeek) {
  return Number(
    week.sessions
      .filter((session) => !session.optional)
      .reduce((sum, session) => sum + (session.distanceKm ?? 0), 0)
      .toFixed(1),
  );
}

export function weekTotalDistanceKm(week: TrainingWeek) {
  return Number(
    week.sessions.reduce((sum, session) => sum + (session.distanceKm ?? 0), 0).toFixed(1),
  );
}

export function flattenSessions(plan: TrainingPlan): PlannedSessionView[] {
  return plan.weeks.flatMap((week) =>
    week.sessions.map((session) => ({
      ...session,
      weekNumber: week.weekNumber,
      date: sessionDate(week, session),
    })),
  );
}

export function completedSessionIds(logs: WorkoutLog[]) {
  return new Set(
    logs
      .map((log) => log.plannedSessionId)
      .filter((plannedSessionId): plannedSessionId is string => Boolean(plannedSessionId)),
  );
}

export function findCurrentWeek(plan: TrainingPlan, date = todayIso()): TrainingWeek {
  const current = plan.weeks.find((week) => isWithin(date, week.startsOn, weekEndsOn(week)));
  if (current) {
    return current;
  }

  if (date < plan.weeks[0].startsOn) {
    return plan.weeks[0];
  }

  return plan.weeks[plan.weeks.length - 1];
}

export function findNextSession(
  plan: TrainingPlan,
  logs: WorkoutLog[],
  date = todayIso(),
): PlannedSessionView | null {
  const done = completedSessionIds(logs);

  return (
    flattenSessions(plan).find(
      (session) => session.date >= date && !done.has(session.id) && !session.optional,
    ) ??
    flattenSessions(plan).find((session) => session.date >= date && !done.has(session.id)) ??
    null
  );
}

export function weekSessionsLeft(plan: TrainingPlan, logs: WorkoutLog[], date = todayIso()) {
  const done = completedSessionIds(logs);
  const currentWeek = findCurrentWeek(plan, date);

  return currentWeek.sessions
    .map((session) => ({
      ...session,
      weekNumber: currentWeek.weekNumber,
      date: sessionDate(currentWeek, session),
    }))
    .filter((session) => session.date >= date && !done.has(session.id));
}

export function raceCountdown(plan: TrainingPlan, date = todayIso()) {
  return Math.max(0, daysBetween(date, plan.race.date));
}

export function plannedSessionsThrough(plan: TrainingPlan, date = todayIso()) {
  return flattenSessions(plan).filter((session) => session.date <= date);
}

export function computeMetrics(plan: TrainingPlan, logs: WorkoutLog[], date = todayIso()) {
  const done = completedSessionIds(logs);
  const plannedToDate = plannedSessionsThrough(plan, date);
  const requiredToDate = plannedToDate.filter((session) => !session.optional);
  const completedRequiredToDate = requiredToDate.filter((session) => done.has(session.id));
  const runLogs = logs.filter((log) => log.distanceKm && log.durationMin);
  const totalDistanceKm = runLogs.reduce((sum, log) => sum + (log.distanceKm ?? 0), 0);
  const totalDurationMin = runLogs.reduce((sum, log) => sum + (log.durationMin ?? 0), 0);
  const longestRunKm = Math.max(0, ...runLogs.map((log) => log.distanceKm ?? 0));
  const averagePaceSecPerKm = secondsPerKmFromWorkout(totalDistanceKm, totalDurationMin);

  const weekly = plan.weeks.map((week) => {
    const endsOn = weekEndsOn(week);
    const weekLogs = runLogs.filter((log) => isWithin(log.date, week.startsOn, endsOn));
    const actualKm = weekLogs.reduce((sum, log) => sum + (log.distanceKm ?? 0), 0);
    const actualDurationMin = weekLogs.reduce((sum, log) => sum + (log.durationMin ?? 0), 0);
    const completedRequired = week.sessions.filter(
      (session) => !session.optional && done.has(session.id),
    ).length;
    const requiredCount = week.sessions.filter((session) => !session.optional).length;

    return {
      weekNumber: week.weekNumber,
      startsOn: week.startsOn,
      endsOn,
      phase: week.focus,
      plannedRequiredKm: weekRequiredDistanceKm(week),
      plannedTotalKm: week.targetDistanceKm,
      actualKm: Number(actualKm.toFixed(1)),
      averagePaceSecPerKm: secondsPerKmFromWorkout(actualKm, actualDurationMin),
      completionPercent:
        requiredCount === 0 ? 0 : Math.round((completedRequired / requiredCount) * 100),
    };
  });

  const paceTrend = runLogs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({
      id: log.id,
      date: log.date,
      distanceKm: log.distanceKm ?? 0,
      durationMin: log.durationMin ?? 0,
      paceSecPerKm: secondsPerKmFromWorkout(log.distanceKm, log.durationMin),
    }));

  return {
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalDurationMin: Math.round(totalDurationMin),
    longestRunKm,
    averagePaceSecPerKm,
    requiredCompletionPercent:
      requiredToDate.length === 0
        ? 0
        : Math.round((completedRequiredToDate.length / requiredToDate.length) * 100),
    completedRequiredCount: completedRequiredToDate.length,
    requiredToDateCount: requiredToDate.length,
    weekly,
    paceTrend,
  };
}
