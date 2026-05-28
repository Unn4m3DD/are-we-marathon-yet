import type { ReadinessEstimate } from '@/lib/types';

interface ReadinessCardProps {
  readiness: ReadinessEstimate;
}

function formatWeeks(weeks: number): string {
  if (weeks === 0) return 'Ready now';
  if (weeks <= 2) return `${weeks} weeks`;
  if (weeks <= 8) return `${weeks} weeks`;
  return `${Math.ceil(weeks / 4)} months`;
}

function getBarColor(effort: number): string {
  if (effort >= 10) return 'bg-red-500';
  if (effort >= 9) return 'bg-orange-500';
  if (effort >= 8) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function getStatusLabel(fls: number | null, requiredFLS: number): string {
  if (fls === null) return 'Log a run to start';
  if (fls >= requiredFLS) return 'Ready';
  const gap = requiredFLS - fls;
  if (gap <= 5) return 'Almost there';
  if (gap <= 15) return 'Good progress';
  if (gap <= 30) return 'Building base';
  return 'Early stage';
}

export function ReadinessCard({ readiness }: ReadinessCardProps) {
  const sortedLevels = [...readiness.levels].sort((a, b) => a.effort - b.effort);

  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Marathon Readiness</h2>
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
        <p className="text-xs text-zinc-500">
          Based on your current Fitness Level Score ({readiness.currentFLS ?? '--'}).
          Higher FLS = faster progression + shorter timeline.
        </p>

        {sortedLevels.map(level => {
          const isReady = readiness.currentFLS !== null && readiness.currentFLS >= level.requiredFLS;
          const progress = isReady ? 100 : Math.max(0, (readiness.currentFLS ?? 0) / level.requiredFLS * 100);

          return (
            <div key={level.effort} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getBarColor(level.effort)}`} />
                  <span className="font-medium">{level.effort}/10 effort</span>
                </div>
                <span className="text-zinc-500">
                  {isReady ? 'Ready now' : formatWeeks(level.estimatedWeeks)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(level.effort)} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-24 text-right">
                  {getStatusLabel(readiness.currentFLS, level.requiredFLS)}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{level.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
