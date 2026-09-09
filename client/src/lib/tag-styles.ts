export const TAG_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30 hover:bg-pink-500/25",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/25",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/25",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/25",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/25",
  slate: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
};

export function getTagBadgeStyle(color?: string | null): string {
  return (color && TAG_COLOR_MAP[color]) || TAG_COLOR_MAP.slate;
}
