'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/actions/data';
import { BottomNav } from '@/components/BottomNav';
import type { AthleteProfile } from '@/lib/types';

interface SettingsClientProps {
  userId: string;
  profile: AthleteProfile;
}

export function SettingsClient({ userId, profile }: SettingsClientProps) {
  const router = useRouter();
  const [minDays, setMinDays] = useState(profile.minRunDaysPerWeek);
  const [maxDays, setMaxDays] = useState(profile.maxRunDaysPerWeek);
  const [unit, setUnit] = useState(profile.distanceUnit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(userId, {
        minRunDaysPerWeek: minDays,
        maxRunDaysPerWeek: maxDays,
        distanceUnit: unit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      alert('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const effectiveMin = Math.min(minDays, maxDays);
  const effectiveMax = Math.max(minDays, maxDays);

  const formatFLS = (fls: number | null) => {
    if (fls === null) return 'Not calculated yet';
    if (fls < 20) return 'Building base';
    if (fls < 40) return 'Developing fitness';
    if (fls < 60) return 'Good progress';
    if (fls < 80) return 'Strong fitness';
    return 'Marathon ready';
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* FLS Status */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Fitness Level</h2>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Level</span>
              <span className="text-2xl font-bold text-emerald-600">
                {profile.currentFLS ?? '--'}
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatFLS(profile.currentFLS)}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Your FLS is calculated from every run you log—distance, pace, and effort. It updates automatically and drives all workout recommendations.
            </p>
          </div>
        </section>

        {/* Weekly Availability */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Weekly Availability</h2>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-4">
            <p className="text-sm text-zinc-500">
              No future schedule is created. When you decide to run, the app chooses today&apos;s workout from your history and weekly availability.
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum run days per week</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={effectiveMin}
                  onChange={(e) => setMinDays(parseInt(e.target.value))}
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-8 text-center font-medium">{effectiveMin}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Minimum {effectiveMin} days: {effectiveMin === 2 ? '1 short + 1 long anchor' : `${effectiveMin} runs including 1 long run`}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Maximum run days per week</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={effectiveMin}
                  max="6"
                  value={effectiveMax}
                  onChange={(e) => setMaxDays(parseInt(e.target.value))}
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-8 text-center font-medium">{effectiveMax}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">App will recommend up to {effectiveMax} runs per week</p>
            </div>
          </div>
        </section>

        {/* Distance Unit */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Units</h2>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setUnit('km')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  unit === 'km'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
                }`}
              >
                Kilometers
              </button>
              <button
                onClick={() => setUnit('mi')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  unit === 'mi'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
                }`}
              >
                Miles
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Account</h2>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
            <p className="text-sm text-zinc-500 mb-2">Your ID</p>
            <p className="text-sm font-mono break-all">{userId}</p>
            <p className="text-xs text-zinc-400 mt-2">Save this ID to sign in on other devices. Anyone with this ID can access your data.</p>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('marathon-user-id');
            router.push('/');
          }}
          className="w-full py-3 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>

      <BottomNav userId={userId} active="settings" />
    </main>
  );
}
