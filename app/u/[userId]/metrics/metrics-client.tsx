"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CheckCircle2, Clock, Route } from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistance, formatDuration, formatPaceAndSpeed, formatPace, paceToSpeedKmh } from "@/lib/pace";
import { trpc } from "@/lib/trpc-client";

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
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="rounded-md bg-cyan-50 p-2 text-cyan-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
          <p className="mt-1 text-sm text-zinc-600">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsClient({ userId }: { userId: string }) {
  const metricsQuery = trpc.metrics.get.useQuery();

  if (metricsQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />;
  }

  if (metricsQuery.error || !metricsQuery.data) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-red-700">Could not load metrics.</p>
          <p className="mt-2 text-sm text-zinc-600">{metricsQuery.error?.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, metrics } = metricsQuery.data;
  const weeklyData = metrics.weekly.map((week) => ({
    week: `W${week.weekNumber}`,
    plannedRequiredKm: week.plannedRequiredKm,
    plannedTotalKm: week.plannedTotalKm,
    actualKm: week.actualKm,
    completionPercent: week.completionPercent,
  }));
  const longRunData = plan.weeks.map((week) => {
    const longRun = week.sessions[week.sessions.length - 1];

    return {
      week: `W${week.weekNumber}`,
      plannedKm: longRun.distanceKm ?? 0,
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
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Metrics</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track volume, completion, long-run progression, and pace with speed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/u/${userId}/log`}>Log Workout</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          detail="Weighted by all logged run distance"
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

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis unit=" km" />
                <Tooltip />
                <Legend />
                <Bar dataKey="plannedRequiredKm" name="Required plan km" fill="#0891b2" />
                <Bar dataKey="actualKm" name="Logged km" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Completion by Week</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="completionPercent" name="Required completed" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Long-Run Progression</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={longRunData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis unit=" km" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="plannedKm"
                  name="Planned long run"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pace and Speed Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {speedTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit=" km/h" />
                  <Tooltip
                    formatter={(value, name, item) => {
                      const payload = item.payload as {
                        pace?: string | null;
                        speedKmh?: number | null;
                      };
                      return [`${Number(value).toFixed(1)} km/h · ${payload.pace ?? "n/a"}`, name];
                    }}
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
              <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                Log a run with distance and duration to see pace and speed over time.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
