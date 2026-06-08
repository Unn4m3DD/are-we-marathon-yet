import defaultTrainingPlan from "@/data/default-training-plan.json";
import { type TrainingPlan, trainingPlanSchema } from "@/lib/training-schema";

export function getDefaultTrainingPlan(): TrainingPlan {
  return trainingPlanSchema.parse(defaultTrainingPlan);
}

export const generateDefaultTrainingPlan = getDefaultTrainingPlan;
