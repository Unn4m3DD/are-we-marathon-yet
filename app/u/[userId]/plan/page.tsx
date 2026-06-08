import { PlanClient } from "@/app/u/[userId]/plan/plan-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function PlanPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return <PlanClient userId={uuidV4Schema.parse(userId)} />;
}
