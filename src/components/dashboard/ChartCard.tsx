export type ChartTable = {
  headers: string[];
  rows: (string | number)[][];
};

/** Card wrapper for a chart with a title, optional headline figure and a table view. */
export function ChartCard({
  title,
  figure,
  note,
  table,
  empty,
  height = "h-64",
  className = "",
  children,
}: {
  title: string;
  figure?: string;
  note?: string;
  table?: ChartTable;
  empty?: string | false;
  height?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-pp-border bg-white p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-pp-primary">{title}</h2>
        {figure && <p className="text-lg font-bold text-pp-primary">{figure}</p>}
      </div>
      {note && <p className="-mt-2 mb-3 text-xs text-pp-muted">{note}</p>}
      {empty ? (
        <div className={`${height} flex items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-pp-muted`}>
          {empty}
        </div>
      ) : (
        <div className={`relative ${height}`}>{children}</div>
      )}
      {table && !empty && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer select-none text-xs font-semibold text-pp-muted hover:text-pp-primary">
            View as table
          </summary>
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-pp-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left">
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={h} className={`px-3 py-1.5 font-semibold ${i ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-pp-border">
                    {r.map((c, ci) => (
                      <td key={ci} className={`px-3 py-1.5 ${ci ? "text-right tnum" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
