import { notFound } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { getRuns } from '@/app/actions/data';
import { HistoryClient } from './HistoryClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function HistoryPage({ params }: PageProps) {
  const { userId } = await params;

  if (!validateUUID(userId)) {
    notFound();
  }

  const runs = await getRuns(userId);

  return <HistoryClient userId={userId} runs={runs} />;
}
