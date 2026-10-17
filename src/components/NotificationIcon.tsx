import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";

const MAP = {
  success: { Icon: CircleCheck, cls: "bg-emerald-50 text-emerald-600" },
  warning: { Icon: TriangleAlert, cls: "bg-amber-50 text-amber-600" },
  error: { Icon: CircleX, cls: "bg-red-50 text-red-600" },
  info: { Icon: Info, cls: "bg-sky-50 text-sky-600" },
} as const;

export function NotificationIcon({ type }: { type: string }) {
  const { Icon, cls } = MAP[type as keyof typeof MAP] ?? MAP.info;
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
