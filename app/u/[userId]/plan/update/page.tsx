import { PlanUpdateClient } from "@/app/u/[userId]/plan/update/plan-update-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function PlanUpdatePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  uuidV4Schema.parse(userId);

  return <PlanUpdateClient />;
}
