import { notFound } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { getUserProfile, getRuns, hasRunToday } from '@/app/actions/data';
import { generateRecommendation } from '@/lib/coach';
import { WorkoutClient } from './WorkoutClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function WorkoutPage({ params }: PageProps) {
  const { userId } = await params;

  if (!validateUUID(userId)) {
    notFound();
  }

  const [profile, allRuns, ranToday] = await Promise.all([
    getUserProfile(userId),
    getRuns(userId),
    hasRunToday(userId),
  ]);

  if (!profile) {
    notFound();
  }

  if (ranToday) {
    notFound();
  }

  const recommendation = generateRecommendation(allRuns, profile, profile.currentFLS);

  if (!recommendation) {
    notFound();
  }

  return <WorkoutClient userId={userId} recommendation={recommendation} />;
}
