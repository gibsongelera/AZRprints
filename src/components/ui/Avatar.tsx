/* eslint-disable @next/next/no-img-element -- avatars come from Supabase Storage (dynamic host) */

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "U"
  );
}

const SIZE = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  src,
  name,
  size = "sm",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${SIZE[size]} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZE[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-pp-accent font-bold text-white ring-2 ring-white ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
