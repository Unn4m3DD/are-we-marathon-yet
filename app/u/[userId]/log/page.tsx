import { LogWorkoutClient } from "@/app/u/[userId]/log/log-workout-client";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function LogWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { userId } = await params;
  const { session } = await searchParams;

  return <LogWorkoutClient userId={uuidV4Schema.parse(userId)} initialSessionId={session ?? null} />;
}
