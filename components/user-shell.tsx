"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  Clipboard,
  ClipboardList,
  History,
  LogOut,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [copiedUserId, setCopiedUserId] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("awm_user_id", userId);
    document.cookie = `awm_user_id=${encodeURIComponent(userId)}; path=/; SameSite=Lax; max-age=31536000`;
  }, [userId]);

  function signOut() {
    window.localStorage.removeItem("awm_user_id");
    document.cookie = "awm_user_id=; path=/; max-age=0";
    router.push("/");
  }

  async function copyUserId() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(userId);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = userId;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopiedUserId(true);
    toast.success("User ID copied", {
      description: "Use it to sign back into this training plan.",
    });
    window.setTimeout(() => setCopiedUserId(false), 1500);
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="shrink-0 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/u/${userId}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
              aria-label="Go to dashboard"
            >
              <Activity className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <Link href={`/u/${userId}`} className="block truncate text-sm font-semibold">
                Are We Marathon Yet
              </Link>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-zinc-500 dark:text-zinc-400">
                <span className="truncate font-mono" title={userId}>
                  {userId}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 rounded p-0"
                  onClick={copyUserId}
                  aria-label="Copy user id"
                >
                  {copiedUserId ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
          <nav className="hidden items-center justify-center gap-1 md:flex">
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
          <div className="flex shrink-0 items-center justify-end gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6">{children}</div>
      </main>

      <nav className="shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
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
