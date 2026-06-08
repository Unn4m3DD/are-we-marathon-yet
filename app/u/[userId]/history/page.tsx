import { HistoryClient } from "@/app/u/[userId]/history/history-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function HistoryPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  uuidV4Schema.parse(userId);

  return <HistoryClient />;
}
