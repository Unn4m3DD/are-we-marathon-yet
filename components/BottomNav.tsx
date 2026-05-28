'use client';

import { Home, History, Settings } from 'lucide-react';
import Link from 'next/link';

interface BottomNavProps {
  userId: string;
  active: 'today' | 'history' | 'settings';
}

export function BottomNav({ userId, active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <Link
          href={`/u/${userId}`}
          className={`flex flex-col items-center py-2 px-4 ${active === 'today' ? 'text-emerald-600' : 'text-zinc-500'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs mt-0.5">Today</span>
        </Link>
        <Link
          href={`/u/${userId}/history`}
          className={`flex flex-col items-center py-2 px-4 ${active === 'history' ? 'text-emerald-600' : 'text-zinc-500'}`}
        >
          <History className="w-5 h-5" />
          <span className="text-xs mt-0.5">History</span>
        </Link>
        <Link
          href={`/u/${userId}/settings`}
          className={`flex flex-col items-center py-2 px-4 ${active === 'settings' ? 'text-emerald-600' : 'text-zinc-500'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs mt-0.5">Settings</span>
        </Link>
      </div>
    </nav>
  );
}