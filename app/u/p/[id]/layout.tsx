import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSharedTrainingData } from "@/server/db";
import { uuidV4Schema } from "@/lib/training-schema";

export const dynamic = "force-dynamic";

export default async function SharedLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidV4Schema.safeParse(id).success || !await getSharedTrainingData(id)) notFound();
  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div><span className="text-sm font-semibold">Are We Marathon Yet</span><span className="ml-2 text-xs text-zinc-500">Read-only</span></div>
          <nav className="flex items-center gap-4">
            <Link href={`/u/p/${id}/history`} className="text-sm font-medium hover:underline">History</Link>
            <Link href={`/u/p/${id}/metrics`} className="text-sm font-medium hover:underline">Metrics</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6">{children}</div></main>
    </div>
  );
}
