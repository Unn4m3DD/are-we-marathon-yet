"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { Activity, CheckCircle2, Clock, Route } from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration, formatPaceAndSpeed, formatPace, paceToSpeedKmh } from "@/lib/pace";
import { trpc } from "@/lib/trpc-client";

type ChartTooltipProps = Partial<TooltipContentProps<number | string, string>> & {
  valueFormatter?: (value: unknown, name: string, payload: unknown) => string;
};

function formatTooltipValue(value: unknown) {
  return Array.isArray(value) ? value.join(" - ") : String(value);
}

function AppChartTooltip({ active, label, payload, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {label ? (
        <p className="mb-2 border-b border-zinc-100 pb-1 font-medium text-zinc-950 dark:border-zinc-800 dark:text-zinc-50">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item) => {
          const name = String(item.name ?? item.dataKey ?? "");
          const value = item.value;

          if (value == null) {
            return null;
          }

          return (
            <div key={`${name}-${item.dataKey}`} className="flex items-center justify-between gap-5">
              <span className="flex min-w-0 items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? item.fill ?? "#0891b2" }}
                />
                <span className="truncate">{name}</span>
              </span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {valueFormatter ? valueFormatter(value, name, item.payload) : formatTooltipValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <span className="rounded-md bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricsClient({ userId }: { userId: string }) {
  const metricsQuery = trpc.metrics.get.useQuery();

  if (metricsQuery.isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  if (metricsQuery.error || !metricsQuery.data) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-3 sm:p-4">
          <p className="font-medium text-red-700 dark:text-red-400">Could not load metrics.</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{metricsQuery.error?.message}</p>
        </div>
      </div>
    );
  }

  const { plan, metrics } = metricsQuery.data;
  const weeklyData = metrics.weekly.map((week) => ({
    week: `W${week.weekNumber}`,
    plannedRequiredKm: week.plannedRequiredKm,
    plannedTotalKm: week.plannedTotalKm,
    actualKm: week.actualKm,
    longestRunKm: week.longestRunKm,
    completionPercent: week.completionPercent,
  }));
  const longRunData = plan.weeks.map((week) => {
    const loggedWeek = metrics.weekly.find((metricWeek) => metricWeek.weekNumber === week.weekNumber);
    const plannedLongestRunKm = Math.max(
      0,
      ...week.sessions.map((session) => session.distanceKm ?? 0),
    );

    return {
      week: `W${week.weekNumber}`,
      plannedLongestRunKm,
      longestRunKm: loggedWeek?.longestRunKm ?? 0,
    };
  });
  const speedTrend = metrics.paceTrend
    .filter((log) => log.paceSecPerKm)
    .map((log) => ({
      date: log.date,
      distanceKm: log.distanceKm,
      speedKmh: log.paceSecPerKm ? Number(paceToSpeedKmh(log.paceSecPerKm).toFixed(2)) : null,
      pace: log.paceSecPerKm ? formatPace(log.paceSecPerKm) : null,
    }));

  return (
    <div className="space-y-3 md:space-y-4">

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Route}
          label="Logged Distance"
          value={`${metrics.totalDistanceKm.toFixed(1)} km`}
          detail={`${formatDuration(metrics.totalDurationMin)} total duration`}
        />
        <StatCard
          icon={Activity}
          label="Average Pace / Speed"
          value={
            metrics.averagePaceSecPerKm
              ? formatPaceAndSpeed(metrics.averagePaceSecPerKm)
              : "No runs yet"
          }
          detail="Weighted by distance"
        />
        <StatCard
          icon={CheckCircle2}
          label="Required Completion"
          value={`${metrics.requiredCompletionPercent}%`}
          detail={`${metrics.completedRequiredCount} of ${metrics.requiredToDateCount} due sessions`}
        />
        <StatCard
          icon={Clock}
          label="Longest Run"
          value={formatDistance(metrics.longestRunKm) ?? "0 km"}
          detail={`Race target is ${plan.race.distanceKm.toFixed(1)} km`}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2 md:gap-4">
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4 pb-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Weekly Volume</h2>
          </div>
          <div className="h-80 p-3 sm:p-4 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis unit=" km" />
                <Tooltip content={<AppChartTooltip />} cursor={{ fill: "rgba(8, 145, 178, 0.08)" }} />
                <Bar dataKey="plannedRequiredKm" name="Required km" fill="#0891b2" />
                <Bar dataKey="actualKm" name="Logged km" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4 pb-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Required Completion by Week</h2>
          </div>
          <div className="h-80 p-3 sm:p-4 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip content={<AppChartTooltip valueFormatter={(value) => `${value}%`} />} cursor={{ fill: "rgba(8, 145, 178, 0.08)" }} />
                <Bar dataKey="completionPercent" name="Required completed" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4 pb-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Long-Run Progression</h2>
          </div>
          <div className="h-80 p-3 sm:p-4 pt-0">
            {longRunData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={longRunData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis unit=" km" />
                  <Tooltip content={<AppChartTooltip valueFormatter={(value) => `${value} km`} />} />
                  <Line
                    type="monotone"
                    dataKey="plannedLongestRunKm"
                    name="Target long run"
                    stroke="#0891b2"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="longestRunKm"
                    name="Longest logged run"
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">
                Log a run with distance to see long-run progression.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="p-3 sm:p-4 pb-3">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Pace and Speed Trend</h2>
          </div>
          <div className="h-80 p-3 sm:p-4 pt-0">
            {speedTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit=" km/h" />
                  <Tooltip
                    content={
                      <AppChartTooltip
                        valueFormatter={(value, _name, itemPayload) => {
                          const typedPayload = itemPayload as {
                            pace?: string | null;
                            speedKmh?: number | null;
                          };

                          return `${Number(value).toFixed(1)} km/h · ${typedPayload.pace ?? "n/a"}`;
                        }}
                      />
                    }
                    cursor={{ stroke: "rgba(8, 145, 178, 0.35)", strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speedKmh"
                    name="Speed"
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">
                Log a run with distance and duration to see pace and speed over time.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
