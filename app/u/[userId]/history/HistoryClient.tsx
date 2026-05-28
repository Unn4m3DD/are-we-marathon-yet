'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRun } from '@/app/actions/data';
import { format } from '@/lib/date';
import { BottomNav } from '@/components/BottomNav';
import type { Run } from '@/lib/types';

interface HistoryClientProps {
  userId: string;
  runs: Run[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}m`;
}

function formatPace(distance: number, seconds: number): string {
  if (!seconds || distance <= 0) return '--:--';
  const paceSeconds = seconds / distance;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HistoryClient({ userId, runs }: HistoryClientProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (runId: string) => {
    setDeleting(true);
    try {
      await deleteRun(userId, runId);
      setConfirmDelete(null);
      router.refresh();
    } catch {
      alert('Could not delete run');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">History</h1>
        <p className="text-xs text-zinc-500">{runs.length} runs logged</p>
      </header>

      <div className="p-4 space-y-2">
        {runs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No runs yet</p>
            <p className="text-sm text-zinc-400 mt-1">Log your first run to calculate your FLS</p>
          </div>
        ) : (
          runs.map(run => (
            <div
              key={run.id}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{run.distance.toFixed(1)} km</p>
                  <p className="text-xs text-zinc-500">{format(run.date, 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm">{formatDuration(run.durationSeconds)}</p>
                    <p className="text-xs text-zinc-500">
                      {run.perceivedEffort ? `Effort ${run.perceivedEffort}/10 • ` : ''}
                      Pace {formatPace(run.distance, run.durationSeconds)}/km
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(run.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {run.flsAfterRun !== undefined && (
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-emerald-600 font-medium">
                    FLS after: {Math.round(run.flsAfterRun)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Delete this run?</h3>
            <p className="text-sm text-zinc-500 mb-4">
              This will recalculate your FLS from remaining runs. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav userId={userId} active="history" />
    </main>
  );
}
