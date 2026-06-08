import { DashboardClient } from "@/app/u/[userId]/dashboard-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function UserHome({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const parsed = uuidV4Schema.parse(userId);

  return <DashboardClient userId={parsed} />;
}
