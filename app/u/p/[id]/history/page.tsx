import { HistoryClient } from "@/app/u/[userId]/history/history-client";
export default async function SharedHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HistoryClient publicId={id} />;
}
