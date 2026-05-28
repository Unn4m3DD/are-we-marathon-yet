import { notFound, redirect } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserProfile, getRuns, getWeeklyRuns, hasRunToday } from '@/app/actions/data';
import { generateRecommendation, getReadinessEstimate } from '@/lib/coach';
import { getParametersFromFLS } from '@/lib/fls';
import { DashboardClient } from './DashboardClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { userId } = await params;

  if (!validateUUID(userId)) {
    notFound();
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    notFound();
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    notFound();
  }

  const allRuns = await getRuns(userId);
  const weeklyRuns = await getWeeklyRuns(userId);
  const ranToday = await hasRunToday(userId);

  const currentFLS = profile.currentFLS;
  const recommendation = !ranToday ? generateRecommendation(allRuns, profile, currentFLS) : null;
  const readiness = getReadinessEstimate(currentFLS);

  // Long anchor: detect runs that approach the long run target for current FLS
  const longThreshold = currentFLS !== null
    ? getParametersFromFLS(currentFLS).longRunTarget * 0.7
    : 5; // Default 5km before FLS established
  const longAnchorDone = weeklyRuns.some(r => r.distance >= longThreshold);

  return (
    <DashboardClient
      userId={userId}
      profile={profile}
      weeklyRuns={weeklyRuns}
      allRuns={allRuns.slice(0, 5)}
      ranToday={ranToday}
      recommendation={recommendation}
      readiness={readiness}
      longAnchorDone={longAnchorDone}
    />
  );
}
