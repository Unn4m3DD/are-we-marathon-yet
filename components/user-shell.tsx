"use client";

import { Activity, BarChart3, CalendarDays, ClipboardList, History, LogOut, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Week", href: "", icon: CalendarDays },
  { label: "Log", href: "/log", icon: PlusCircle },
  { label: "History", href: "/history", icon: History },
  { label: "Metrics", href: "/metrics", icon: BarChart3 },
  { label: "Plan", href: "/plan", icon: ClipboardList },
];

export function UserShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem("awm_user_id", userId);
    document.cookie = `awm_user_id=${encodeURIComponent(userId)}; path=/; SameSite=Lax; max-age=31536000`;
  }, [userId]);

  function signOut() {
    window.localStorage.removeItem("awm_user_id");
    document.cookie = "awm_user_id=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={`/u/${userId}`} className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
              <Activity className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Are We Marathon Yet</span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{userId}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const href = `/u/${userId}${item.href}`;
              const active = item.href === "" ? pathname === href : pathname.startsWith(href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    active && "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const href = `/u/${userId}${item.href}`;
            const active = item.href === "" ? pathname === href : pathname.startsWith(href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400",
                  active && "text-cyan-800 dark:text-cyan-200",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
