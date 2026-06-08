"use client";

import { Check, Copy, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatReadableDate } from "@/lib/dates";
import { formatDistance, formatDuration, formatPaceAndSpeed, secondsPerKmFromWorkout } from "@/lib/pace";
import { flattenSessions } from "@/lib/plan-utils";
import { trpc } from "@/lib/trpc-client";
import { type TrainingPlan, trainingPlanSchema } from "@/lib/training-schema";

function runLine(log: {
  date: string;
  type: string;
  plannedSessionId: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  perceivedEffort: number | null;
  notes: string | null;
}) {
  const pace = secondsPerKmFromWorkout(log.distanceKm, log.durationMin);

  return {
    date: log.date,
    type: log.type,
    plannedSessionId: log.plannedSessionId,
    distance: formatDistance(log.distanceKm),
    duration: formatDuration(log.durationMin),
    paceAndSpeed: pace ? formatPaceAndSpeed(pace) : null,
    rpe: log.perceivedEffort,
    notes: log.notes,
  };
}

function buildPrompt({
  feedback,
  plan,
  logs,
}: {
  feedback: string;
  plan: TrainingPlan;
  logs: ReturnType<typeof runLine>[];
}) {
  const sessions = flattenSessions(plan);
  const schemaGuide = {
    topLevel: {
      schemaVersion: "must be literal 2",
      planId: "non-empty string",
      name: "non-empty string",
      race: "{ date: YYYY-MM-DD, distanceKm: positive number }",
      athleteBaseline: "{ date: YYYY-MM-DD, distanceKm: positive number, durationMin: positive number }",
      units: {
        distance: "must be 'km'",
        duration: "must be 'min'",
        effort: "must be 'rpe_1_10'",
      },
      progression:
        "basis must be 'baseline'; longRunStartKm, longRunPeakKm, weeklyDistanceStartKm, weeklyDistancePeakKm must be positive numbers",
      weeks:
        "array of weeks. Each week must have weekNumber, startsOn YYYY-MM-DD, focus, targetDistanceKm, optional notes, and 4-6 sessions.",
    },
    weekRules: {
      focus: ["base", "build", "cutback", "peak", "taper", "race"],
      optionalSessions: "exactly 2 sessions per week must have optional: true",
    },
    sessionRules: {
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      type: ["easy", "recovery", "long", "tempo", "interval", "hills", "marathonPace", "race"],
      requiredFields:
        "id, day, type, optional, title, distanceKm, targetRpe.",
      optionalFields: "structure, notes",
      distanceKm: "positive number",
      targetRpe: "integer from 1 to 10. Most easy/recovery running should be RPE 2-4; quality work usually RPE 5-7.",
    },
  };

  return [
    "You are helping me update my marathon training plan.",
    "",
    "Goal:",
    "- Race: marathon on 2026-11-08.",
    "- Distance: 42.2 km.",
    "- I train 4 to 6 times per week.",
    "- Exactly 2 workouts per week should be optional.",
    "- Running workouts only. Do not add strength or mobility sessions.",
    "- I want the plan to adapt to my actual run history and my feedback below.",
    "- Do not prescribe planned pace targets. Use RPE out of 10 for planned intensity.",
    "",
    "Output contract:",
    "- Return ONLY valid JSON. No markdown fences, no commentary, no explanation.",
    "- The JSON must be a complete replacement training plan, not a patch.",
    "- It must include every planned running session through race day.",
    "- It must satisfy the schema/rules below.",
    "- Preserve existing completed workout IDs when it makes sense, but you may revise future sessions.",
    "- Optional runs should stay easy and should be skippable without needing to make up distance.",
    "",
    "Schema/rules summary:",
    JSON.stringify(schemaGuide, null, 2),
    "",
    "My manually written feedback:",
    feedback.trim() || "(No extra feedback provided.)",
    "",
    "Current plan JSON:",
    JSON.stringify(plan, null, 2),
    "",
    "Planned session lookup with derived dates:",
    JSON.stringify(sessions, null, 2),
    "",
    "Current run history:",
    JSON.stringify(logs, null, 2),
    "",
    "Generate the new complete plan JSON now.",
  ].join("\n");
}

export function PlanUpdateClient() {
  const utils = trpc.useUtils();
  const planQuery = trpc.plan.get.useQuery();
  const logsQuery = trpc.workout.logs.useQuery();
  const historyQuery = trpc.plan.history.useQuery();
  const [feedback, setFeedback] = useState("");
  const [planJson, setPlanJson] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const savePlan = trpc.plan.save.useMutation({
    onSuccess: async (savedPlan) => {
      setPlanJson(JSON.stringify(savedPlan, null, 2));
      setStatus("Saved new plan.");
      await Promise.all([
        utils.plan.get.invalidate(),
        utils.plan.history.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
    },
  });

  const runHistory = useMemo(() => (logsQuery.data ?? []).map(runLine), [logsQuery.data]);
  const prompt = useMemo(() => {
    if (!planQuery.data) {
      return "";
    }

    return buildPrompt({
      feedback,
      plan: planQuery.data,
      logs: runHistory,
    });
  }, [feedback, planQuery.data, runHistory]);

  async function copyPrompt() {
    setStatus(null);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function saveGeneratedPlan() {
    setStatus(null);

    try {
      const parsed = trainingPlanSchema.parse(JSON.parse(planJson));
      savePlan.mutate({
        plan: parsed,
        source: "chatgpt",
        feedback: feedback.trim() || undefined,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Plan JSON is invalid.");
    }
  }

  const loading = planQuery.isLoading || logsQuery.isLoading || historyQuery.isLoading;

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />;
  }

  if (planQuery.error || logsQuery.error || !planQuery.data) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-medium text-red-700">Could not load plan update context.</p>
          <p className="mt-2 text-sm text-zinc-600">
            {planQuery.error?.message ?? logsQuery.error?.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Update Plan with ChatGPT</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Write feedback, copy a complete prompt, paste it into ChatGPT, then paste the returned JSON here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Feedback</CardTitle>
              <CardDescription>
                Include soreness, missed runs, travel, RPE/effort concerns, goals, or anything the plan should adapt to.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback for ChatGPT</Label>
                <Textarea
                  id="feedback"
                  className="min-h-40"
                  value={feedback}
                  onChange={(event) => {
                    setFeedback(event.target.value);
                    setStatus(null);
                  }}
                  placeholder="Example: I missed two runs this week, my calves are tight, and long runs above 24 km feel mentally hard..."
                />
              </div>
              <Button type="button" onClick={copyPrompt} disabled={!prompt}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Prompt"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paste New Plan JSON</CardTitle>
              <CardDescription>
                The app validates the JSON against the same Zod schema before replacing your current plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[32rem] font-mono text-xs"
                value={planJson}
                onChange={(event) => {
                  setPlanJson(event.target.value);
                  setStatus(null);
                }}
                spellCheck={false}
                placeholder='Paste the complete JSON plan from ChatGPT here. It should start with {"schemaVersion":1,...}'
              />
              {status || savePlan.error ? (
                <p
                  className={
                    status === "Saved new plan." ? "text-sm text-emerald-700" : "text-sm text-red-600"
                  }
                >
                  {status ?? savePlan.error?.message}
                </p>
              ) : null}
              <Button type="button" onClick={saveGeneratedPlan} disabled={savePlan.isPending}>
                <Save className="h-4 w-4" />
                {savePlan.isPending ? "Saving..." : "Save New Plan"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Context</CardTitle>
              <CardDescription>The copied prompt includes these live inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-700">
              <p>Current plan: {planQuery.data.weeks.length} weeks.</p>
              <p>Planned sessions: {flattenSessions(planQuery.data).length}.</p>
              <p>Run history entries: {logsQuery.data?.length ?? 0}.</p>
              <p>Race day: {formatReadableDate(planQuery.data.race.date)}.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan History</CardTitle>
              <CardDescription>Every saved plan version for this user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(historyQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-zinc-600">No saved plan versions yet.</p>
              ) : (
                historyQuery.data?.map((version) => (
                  <div key={version.id} className="border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={version.source === "chatgpt" ? "default" : "muted"}>
                        {version.source}
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-700">
                      {version.plan.weeks.length} weeks · race {formatReadableDate(version.raceDate)}
                    </p>
                    {version.feedback ? (
                      <p className="mt-1 line-clamp-3 text-sm text-zinc-600">{version.feedback}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
