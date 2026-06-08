import plan from "@/data/default-training-plan.json";
import { trainingPlanSchema } from "@/lib/training-schema";

const parsed = trainingPlanSchema.parse(plan);
const sessionCount = parsed.weeks.reduce((count, week) => count + week.sessions.length, 0);

console.log(
  `Valid training plan: ${parsed.weeks.length} weeks, ${sessionCount} sessions, race ${parsed.race.date}.`,
);
