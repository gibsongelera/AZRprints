"use client";

import {
  Bell,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useDismiss } from "@/components/ui/useDismiss";
import type { UserRole } from "@/lib/types";

type Item = { href: string; label: string; icon: typeof Bell };

export function ProfileMenu({
  role,
  name,
  email,
  avatarUrl,
  onLogout,
}: {
  role: UserRole;
  name: string;
  email: string;
  avatarUrl: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  const items: Item[] =
    role === "admin"
      ? [
          { href: "/admin/profile", label: "My profile", icon: UserRound },
          { href: "/admin/settings", label: "Shop settings", icon: Settings },
          { href: "/admin/notifications", label: "Notifications", icon: Bell },
          { href: "/admin/tickets", label: "Support tickets", icon: LifeBuoy },
        ]
      : [
          { href: "/user/profile", label: "My profile", icon: UserRound },
          { href: "/user/notifications", label: "Notifications", icon: Bell },
          { href: "/user/tickets", label: "Help & support", icon: LifeBuoy },
        ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
      >
        <Avatar src={avatarUrl} name={name} size="sm" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
          {name}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-pp-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="pp-pop absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-pp-border bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-pp-border px-4 py-3">
            <Avatar src={avatarUrl} name={name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-pp-muted">{email}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  role === "admin"
                    ? "bg-slate-900 text-white"
                    : "bg-red-50 text-pp-accent"
                }`}
              >
                {role === "admin" ? "Administrator" : "Student"}
              </span>
            </div>
          </div>
          <div className="py-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                <it.icon className="h-4 w-4 text-pp-muted" aria-hidden />
                {it.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-pp-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
