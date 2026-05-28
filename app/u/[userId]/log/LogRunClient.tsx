'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logRun } from '@/app/actions/data';
import { BottomNav } from '@/components/BottomNav';
import type { Run } from '@/lib/types';

interface LogRunClientProps {
  userId: string;
  currentFLS: number | null;
  previousRuns: Run[];
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}m`;
}

function formatSpeed(distance: number, seconds: number): string {
  if (!seconds || distance <= 0) return '0.0 km/h';
  const speedKmh = (distance / seconds) * 3600;
  return `${speedKmh.toFixed(1)} km/h`;
}

export function LogRunClient({ userId, currentFLS, previousRuns }: LogRunClientProps) {
  const router = useRouter();
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [distance, setDistance] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [newFLS, setNewFLS] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effort || !distance || !durationMinutes) return;

    const dist = parseFloat(distance);
    const mins = parseInt(durationMinutes);

    if (dist <= 0 || mins <= 0) {
      alert('Please enter valid distance and duration');
      return;
    }

    setLoading(true);
    try {
      const result = await logRun(userId, {
        distance: dist,
        durationSeconds: mins * 60,
        perceivedEffort: effort,
        date: new Date(date),
      });
      setNewFLS(result.newFLS);
    } catch {
      alert('Could not save run');
    } finally {
      setLoading(false);
    }
  };

  if (newFLS !== null) {
    return (
      <main className="min-h-screen pb-24">
        <header className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold">Run Logged!</h1>
        </header>

        <div className="p-4 space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              {currentFLS === null ? 'Initial FLS calculated' : 'FLS updated'}
            </p>
            <p className="text-4xl font-bold text-emerald-600">{Math.round(newFLS)}</p>
            {currentFLS !== null && (
              <p className="text-sm text-zinc-500 mt-2">
                {newFLS > currentFLS ? '↑' : newFLS < currentFLS ? '↓' : '→'} from {Math.round(currentFLS)}
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-2">
              Your Fitness Level Score now drives all recommendations
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setNewFLS(null);
                setDistance('');
                setDurationMinutes('');
                setEffort(null);
                setDate(formatDateForInput(new Date()));
              }}
              className="flex-1 py-3 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg font-medium transition-colors"
            >
              Log Another
            </button>
            <button
              onClick={() => {
                router.push(`/u/${userId}`);
                router.refresh();
              }}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        <BottomNav userId={userId} active="log" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Log Run</h1>
        <p className="text-xs text-zinc-500">Manually record a completed run</p>
      </header>

      <div className="p-4 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              max={formatDateForInput(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              required
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium mb-2">Distance (km)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="5.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              placeholder="35"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              required
            />
            {distance && durationMinutes && (
              <p className="text-sm text-zinc-500 mt-2">
                Speed: {formatSpeed(parseFloat(distance), parseInt(durationMinutes) * 60)}
              </p>
            )}
          </div>

          {/* Effort */}
          <div>
            <label className="block text-sm font-medium mb-3">Perceived Effort (1-10)</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setEffort(num)}
                  className={`py-3 rounded-lg font-medium transition-colors ${
                    effort === num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>Easy</span>
              <span>Hard</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!effort || !distance || !durationMinutes || loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Log Run'}
          </button>
        </form>

        {/* Previous Runs */}
        {previousRuns.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Recent Runs
            </h2>
            <div className="space-y-2">
              {previousRuns.map((run) => (
                <div
                  key={run.id}
                  className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{run.distance.toFixed(1)} km</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(run.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatDuration(run.durationSeconds)}</p>
                    <p className="text-xs text-zinc-500">
                      Effort {run.perceivedEffort}/10 • Speed {formatSpeed(run.distance, run.durationSeconds)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current FLS */}
        {currentFLS !== null && (
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
            <p className="text-sm text-zinc-500">Current FLS</p>
            <p className="text-2xl font-bold">{Math.round(currentFLS)}</p>
          </div>
        )}
      </div>

      <BottomNav userId={userId} active="log" />
    </main>
  );
}
