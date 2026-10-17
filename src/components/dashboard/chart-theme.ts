"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/**
 * Validated categorical slots (dataviz reference palette, checked against a
 * white card surface: adjacent CVD ΔE ≥ 9.2) + reserved status colors.
 * Aqua sits under 3:1 contrast, so every chart ships with a table view.
 */
export const VIZ = {
  series: ["#2a78d6", "#eb6834", "#1baf7a"],
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  info: "#2a78d6",
  muted: "#9ca3af",
  ink: "#0f172a",
  ink2: "#475569",
  grid: "#e2e8f0",
  surface: "#ffffff",
};

if (typeof document !== "undefined") {
  ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily;
}
ChartJS.defaults.font.size = 12;
ChartJS.defaults.color = VIZ.ink2;
ChartJS.defaults.borderColor = VIZ.grid;
ChartJS.defaults.plugins.tooltip.backgroundColor = VIZ.ink;
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
ChartJS.defaults.plugins.tooltip.titleFont = { weight: 600 };
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
ChartJS.defaults.plugins.legend.labels.pointStyle = "rectRounded";
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.plugins.legend.labels.boxHeight = 10;

/** Writes the value just past the end of each horizontal bar (selective direct labels). */
export function endLabels(format: (v: number) => string): Plugin<"bar"> {
  return {
    id: "endLabels",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((el, i) => {
          const v = Number(ds.data[i]);
          if (!v) return;
          const { x, y } = el.getProps(["x", "y"], true) as { x: number; y: number };
          ctx.save();
          ctx.fillStyle = VIZ.ink;
          ctx.font = `600 12px ${ChartJS.defaults.font.family}`;
          ctx.textBaseline = "middle";
          ctx.fillText(format(v), x + 6, y);
          ctx.restore();
        });
      });
    },
  };
}

export function compactPeso(v: number) {
  if (Math.abs(v) >= 1000) {
    return `₱${(v / 1000).toLocaleString("en-PH", { maximumFractionDigits: 1 })}k`;
  }
  return `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export { ChartJS };
