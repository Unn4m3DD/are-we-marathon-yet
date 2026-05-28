'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validate as validateUUID } from 'uuid';
import { signIn, signUp } from './actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [uuid, setUuid] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lastUuid = localStorage.getItem('marathon-user-id');
    if (lastUuid) {
      setUuid(lastUuid);
    }
  }, []);

  const handleSignIn = async () => {
    setError('');
    if (!validateUUID(uuid)) {
      setError('Invalid UUID format');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(uuid);
      if (result.success) {
        localStorage.setItem('marathon-user-id', uuid);
        router.push(`/u/${uuid}`);
      } else {
        setError('User not found');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      const newId = crypto.randomUUID();
      const result = await signUp(newId);
      if (result.success) {
        localStorage.setItem('marathon-user-id', newId);
        router.push(`/u/${newId}`);
      } else {
        setError('Could not create user');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Are We Marathon Yet</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-8">
          On-demand marathon readiness coach
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Your ID</label>
            <input
              type="text"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="Enter UUID to sign in"
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              Anyone with this ID can access your data. Save it somewhere safe.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading || !uuid}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-zinc-950 text-zinc-500">or</span>
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create New Account'}
          </button>
        </div>
      </div>
    </main>
  );
}