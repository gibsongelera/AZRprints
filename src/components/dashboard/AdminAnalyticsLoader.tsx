"use client";

import dynamic from "next/dynamic";
import type { AnalyticsOrder, AnalyticsTicket } from "@/lib/analytics";

/** Charts render on the client only (canvas + the viewer's local time zone). */
const AdminAnalytics = dynamic(() => import("./AdminAnalytics"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-200/70 animate-pulse" />
    </div>
  ),
});

export function AdminAnalyticsLoader(props: {
  orders: AnalyticsOrder[];
  tickets: AnalyticsTicket[];
  studentCount: number;
}) {
  return <AdminAnalytics {...props} />;
}
