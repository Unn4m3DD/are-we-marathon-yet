import { notFound, redirect } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { getUserProfile, getRuns } from '@/app/actions/data';
import { LogRunClient } from './LogRunClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function LogRunPage({ params }: PageProps) {
  const { userId } = await params;

  if (!validateUUID(userId)) {
    notFound();
  }

  const [profile, runs] = await Promise.all([
    getUserProfile(userId),
    getRuns(userId),
  ]);

  if (!profile) {
    notFound();
  }

  return <LogRunClient userId={userId} currentFLS={profile.currentFLS} previousRuns={runs.slice(0, 5)} />;
}
