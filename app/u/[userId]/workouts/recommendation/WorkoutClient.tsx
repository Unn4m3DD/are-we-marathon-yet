'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logRun } from '@/app/actions/data';
import type { Recommendation } from '@/lib/types';

interface WorkoutClientProps {
  userId: string;
  recommendation: Recommendation;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins} min`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

export function WorkoutClient({ userId, recommendation }: WorkoutClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<'confirm' | 'log' | 'complete'>('confirm');
  const [actualDistance, setActualDistance] = useState(recommendation.distance.toString());
  const [actualDuration, setActualDuration] = useState(
    Math.round(recommendation.targetDurationSeconds / 60).toString()
  );
  const [effort, setEffort] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [newFLS, setNewFLS] = useState<number | null>(null);

  const handleLogRun = async () => {
    if (!effort) return;

    const distance = parseFloat(actualDistance);
    const durationMinutes = parseInt(actualDuration);

    if (!distance || !durationMinutes || distance <= 0 || durationMinutes <= 0) {
      alert('Please enter valid distance and duration');
      return;
    }

    setLoading(true);
    try {
      const result = await logRun(userId, {
        distance,
        durationSeconds: durationMinutes * 60,
        perceivedEffort: effort,
        date: new Date(),
      });
      setNewFLS(result.newFLS);
      setStep('complete');
    } catch {
      alert('Could not save run');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete' && newFLS !== null) {
    return (
      <main className="min-h-screen p-4">
        <header className="mb-6">
          <h1 className="text-xl font-bold">Run Logged!</h1>
          <p className="text-sm text-zinc-500 mt-1">Your FLS has been updated</p>
        </header>

        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">New Fitness Level Score</p>
            <p className="text-4xl font-bold text-emerald-600">{Math.round(newFLS)}</p>
            <p className="text-xs text-zinc-500 mt-2">
              This single number now drives all your future recommendations
            </p>
          </div>

          <button
            onClick={() => {
              router.push(`/u/${userId}`);
              router.refresh();
            }}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (step === 'log') {
    return (
      <main className="min-h-screen p-4">
        <header className="mb-6">
          <button
            onClick={() => setStep('confirm')}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold mt-4">Log Your Run</h1>
          <p className="text-sm text-zinc-500 mt-1">Record what you actually did</p>
        </header>

        <div className="space-y-6">
          {/* Actual Results */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={actualDistance}
                onChange={(e) => setActualDistance(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={actualDuration}
                onChange={(e) => setActualDuration(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg"
              />
            </div>
          </div>

          {/* Effort Rating */}
          <div>
            <label className="block text-sm font-medium mb-3">Perceived Effort (1-10)</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
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

          <button
            onClick={handleLogRun}
            disabled={!effort || loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Log Run & Update FLS'}
          </button>
        </div>
      </main>
    );
  }

  // Confirm step
  return (
    <main className="min-h-screen p-4">
      <header className="mb-6">
        <button
          onClick={() => router.push(`/u/${userId}`)}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back
        </button>
      </header>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-zinc-500 mb-1 uppercase tracking-wide">{recommendation.type}</p>
          <h1 className="text-2xl font-bold">{recommendation.reason}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">{recommendation.description}</p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Target Distance</span>
            <span className="font-semibold">{recommendation.distance.toFixed(1)} km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Target Duration</span>
            <span className="font-semibold">{formatDuration(recommendation.targetDurationSeconds)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Target Speed</span>
            <span className="font-semibold">{formatSpeed(recommendation.targetSpeedKmh)}</span>
          </div>
        </div>

        <button
          onClick={() => setStep('log')}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
        >
          I&apos;m Done — Log Run
        </button>
      </div>
    </main>
  );
}
