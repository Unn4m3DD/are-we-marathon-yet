import { MetricsClient } from "@/app/u/[userId]/metrics/metrics-client";
export default async function SharedMetrics({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MetricsClient publicId={id} />;
}
