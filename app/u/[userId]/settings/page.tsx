import { notFound } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { getUserProfile } from '@/app/actions/data';
import { SettingsClient } from './SettingsClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { userId } = await params;

  if (!validateUUID(userId)) {
    notFound();
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    notFound();
  }

  return <SettingsClient userId={userId} profile={profile} />;
}