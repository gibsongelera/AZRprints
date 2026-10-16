import type { LucideIcon } from "lucide-react";

/**
 * Colorful KPI tile. Each tone pairs a 600→700/800 gradient with white text so
 * labels and figures stay above 4.5:1 contrast.
 */
const TONES = {
  emerald: "from-emerald-600 to-emerald-800",
  blue: "from-blue-600 to-blue-800",
  violet: "from-violet-600 to-violet-800",
  orange: "from-orange-700 to-amber-800",
  rose: "from-rose-600 to-rose-800",
  cyan: "from-cyan-700 to-cyan-900",
  indigo: "from-indigo-600 to-indigo-800",
  teal: "from-teal-700 to-teal-900",
} as const;

export type KpiTone = keyof typeof TONES;

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: KpiTone;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${TONES[tone]} p-4 text-white shadow-sm`}
    >
      {/* soft highlight ring in the corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="relative mt-2 text-2xl font-bold leading-tight sm:text-[1.75rem]">{value}</p>
      {sub && <p className="relative mt-1 text-xs font-medium text-white">{sub}</p>}
    </div>
  );
}
