import { MetricsClient } from "@/app/u/[userId]/metrics/metrics-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function MetricsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return <MetricsClient userId={uuidV4Schema.parse(userId)} />;
}
