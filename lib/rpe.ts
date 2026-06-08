export function rpeToneClass(rpe: number | undefined) {
  if (!rpe || rpe <= 4) {
    return "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  }

  if (rpe <= 6) {
    return "bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100";
  }

  return "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100";
}
