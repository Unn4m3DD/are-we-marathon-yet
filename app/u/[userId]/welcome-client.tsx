"use client";

import { Clipboard, Save, Wand2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc-client";
import { trainingPlanSchema } from "@/lib/training-schema";

const validatorSource = `import { z } from "zod";

const isoDateSchema = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/);
const workoutTypeSchema = z.enum(["easy", "threshold", "interval", "repetition"]);
const dayOfWeekSchema = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const trainingSessionSchema = z.object({
  id: z.string().min(1),
  day: dayOfWeekSchema,
  type: workoutTypeSchema,
  optional: z.boolean(),
  distanceKm: z.number().positive(),
  targetRpe: z.number().int().min(1).max(10),
  description: z.string().min(1).optional(),
}).superRefine((session, ctx) => {
  if (session.type !== "easy" && !session.description) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Quality sessions need a description.",
      path: ["description"],
    });
  }
});

const trainingWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  startsOn: isoDateSchema,
  targetDistanceKm: z.number().nonnegative(),
  notes: z.string().min(1).optional(),
  sessions: z.array(trainingSessionSchema).min(4).max(6),
}).superRefine((week, ctx) => {
  const optionalCount = week.sessions.filter((session) => session.optional).length;
  if (optionalCount !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each week must have exactly 2 optional sessions.",
      path: ["sessions"],
    });
  }
});

export const trainingPlanSchema = z.object({
  schemaVersion: z.literal(3),
  planId: z.string().min(1),
  name: z.string().min(1),
  race: z.object({
    date: isoDateSchema,
    distanceKm: z.number().positive(),
  }),
  athleteBaseline: z.object({
    date: isoDateSchema,
    distanceKm: z.number().positive(),
    durationMin: z.number().positive(),
  }),
  units: z.object({
    distance: z.literal("km"),
    duration: z.literal("min"),
    effort: z.literal("rpe_1_10"),
  }),
  progression: z.object({
    basis: z.literal("baseline"),
    longRunStartKm: z.number().positive(),
    longRunPeakKm: z.number().positive(),
    weeklyDistanceStartKm: z.number().positive(),
    weeklyDistancePeakKm: z.number().positive(),
  }),
  weeks: z.array(trainingWeekSchema).min(1),
});`;

function buildPrompt(objectives: string) {
  return `Create a marathon training plan as strict JSON only. Do not wrap the output in markdown, do not add comments, and do not include prose outside the JSON object.

Athlete objectives:
${objectives.trim() || "The athlete has not provided extra details. Ask only by making reasonable assumptions in the JSON fields."}

Schema and training rules:
- The app stores one plan object matching the Zod schema below.
- Use kilometers, minutes, and RPE from 1 to 10.
- Each week must have 4 to 6 running sessions.
- Each week must have exactly 2 optional sessions. Required sessions should be the core plan.
- Running session types are "easy", "threshold", "interval", and "repetition".
- Every session must have a stable unique id, such as "w01-mon-easy".
- Every session needs distanceKm and targetRpe.
- Quality sessions, meaning every type except "easy", need a concise description.
- Week startsOn values should be ISO YYYY-MM-DD dates for Mondays.
- race.date and athleteBaseline.date must also be ISO YYYY-MM-DD dates.
- schemaVersion must be 3.
- units must be { "distance": "km", "duration": "min", "effort": "rpe_1_10" }.
- progression.basis must be "baseline".

Zod validator:
\`\`\`ts
${validatorSource}
\`\`\`

Return a JSON object that passes trainingPlanSchema.parse(plan).`;
}

function extractJson(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  return fenced?.[1]?.trim() ?? trimmed;
}

export function WelcomeClient({ userId }: { userId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [objectives, setObjectives] = useState("");
  const [prompt, setPrompt] = useState("");
  const [planJson, setPlanJson] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const useDefaultPlan = trpc.plan.useDefault.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.plan.get.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
      router.push(`/u/${userId}`);
      router.refresh();
    },
  });
  const savePlan = trpc.plan.save.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.plan.get.invalidate(),
        utils.dashboard.get.invalidate(),
        utils.metrics.get.invalidate(),
      ]);
      router.push(`/u/${userId}`);
      router.refresh();
    },
  });

  function generatePrompt() {
    setPrompt(buildPrompt(objectives));
    setStatus("Prompt generated.");
    setError(null);
  }

  async function copyPrompt() {
    if (!prompt) {
      return;
    }

    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied", {
      description: "Paste it into your locally sourced grass fed LLM.",
    });
  }

  function submitGeneratedPlan() {
    setStatus(null);
    setError(null);

    try {
      const parsed = trainingPlanSchema.parse(JSON.parse(extractJson(planJson)));
      savePlan.mutate({ plan: parsed });
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Plan JSON is invalid.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-50 px-4 py-5 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
              Are We Marathon Yet
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
              Choose your training plan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Start with the existing marathon plan, or generate a custom plan and paste it back here.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Use the default marathon plan</CardTitle>
              <CardDescription>
                Pick the pre-made plan currently used by the app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={() => useDefaultPlan.mutate()}
                disabled={useDefaultPlan.isPending}
                className="w-full sm:w-auto"
              >
                {useDefaultPlan.isPending ? "Creating plan..." : "Pick Default Plan"}
              </Button>
              {useDefaultPlan.error ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {useDefaultPlan.error.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate your own</CardTitle>
              <CardDescription>
                Describe the target race, date, distance, baseline fitness, schedule, and constraints.<br/>
                
                Then you can ask your locally sourced, grass fed, homemade, carbon neutral, trad coded,  LLM to generate a training plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objectives">Objectives</Label>
                <Textarea
                  id="objectives"
                  value={objectives}
                  onChange={(event) => setObjectives(event.target.value)}
                  placeholder="Race date, distance, weekly availability, current long run, recent race times, injury constraints..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={generatePrompt}>
                  <Wand2 className="h-4 w-4" />
                  Generate Prompt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyPrompt}
                  disabled={!prompt}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy Prompt
                </Button>
              </div>

              {prompt ? (
                <div className="space-y-2">
                  <Label htmlFor="generated-prompt">Generated prompt</Label>
                  <Textarea
                    id="generated-prompt"
                    className="min-h-80 font-mono text-xs"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    spellCheck={false}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="plan-json">Paste generated plan JSON</Label>
                <Textarea
                  id="plan-json"
                  className="min-h-64 font-mono text-xs"
                  value={planJson}
                  onChange={(event) => {
                    setPlanJson(event.target.value);
                    setError(null);
                    setStatus(null);
                  }}
                  placeholder='{"schemaVersion":3,...}'
                  spellCheck={false}
                />
              </div>

              {status ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{status}</p> : null}
              {error || savePlan.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error ?? savePlan.error?.message}
                </p>
              ) : null}

              <Button
                type="button"
                onClick={submitGeneratedPlan}
                disabled={savePlan.isPending || !planJson.trim()}
              >
                <Save className="h-4 w-4" />
                {savePlan.isPending ? "Saving..." : "Save Generated Plan"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
