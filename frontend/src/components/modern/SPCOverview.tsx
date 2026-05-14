import { useEffect, useState } from "react";
import { SPCOverviewSkeleton } from "./Skeleton";

interface OverviewData {
  stats: Array<{
    label: string;
    value: number;
    caption: string;
    className: string;
  }>;
  pending: Array<{ name: string; action: string }>;
  deadlines: Array<{ name: string; date: string }>;
}

export function ModernSPCOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        stats: [
          { label: "Students", value: 2, caption: "Registered", className: "bg-[#1e1e1e]" },
          { label: "Verified", value: 1, caption: "Profiles", className: "bg-[#1f8f2e]" },
          { label: "Companies", value: 2, caption: "This Season", className: "bg-[#347f93]" },
          { label: "Placements", value: 1, caption: "Confirmed", className: "bg-[#d2c52c]" },
        ],
        pending: [
          { name: "Abc", action: "Verify" },
          { name: "Def", action: "Verify" },
          { name: "Ghi", action: "Verify" },
        ],
        deadlines: [
          { name: "Infosys", date: "June 6" },
          { name: "NetApp", date: "June 9" },
          { name: "PhonePe", date: "June 10" },
        ],
      });
      setLoading(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !data) {
    return <SPCOverviewSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-center text-sm font-medium uppercase tracking-wide text-gray-500">
        Here is your placement overview!
      </p>

      <div className="grid grid-cols-2 gap-4">
        {data.stats.map((stat) => (
          <div
            key={`${stat.label}-${stat.caption}`}
            className={`flex h-20 flex-col items-center justify-center rounded-[1.75rem] text-slate-900 dark:text-white shadow-xl ${stat.className}`}
          >
            <span className="text-sm font-bold uppercase">{stat.label}</span>
            <span className="text-3xl font-bold leading-none">{stat.value}</span>
            <span className="text-xs font-bold uppercase">{stat.caption}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MiniList title="Pending Verifications" rows={data.pending} tone="green" />
        <MiniList title="Upcoming Deadlines" rows={data.deadlines} tone="gold" />
      </div>
    </div>
  );
}

function MiniList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: Array<{ name: string; action?: string; date?: string }>;
  tone: "green" | "gold";
}) {
  return (
    <section className="rounded-[1.5rem] bg-[#4a4a4a] p-3 text-slate-900 dark:text-white shadow-xl">
      <h2 className="mb-2 px-2 text-sm font-bold">{title}</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${row.name}-${row.action ?? row.date}`}
            className="flex h-12 items-center justify-between rounded-full bg-[#151515] pl-5 pr-1.5 shadow-inner"
          >
            <span className="text-sm font-bold">{row.name}</span>
            <button
              type="button"
              className={`h-11 rounded-full px-4 text-xs font-bold text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#151515] ${
                tone === "green" ? "bg-[#10805b]" : "bg-[#9a8d12]"
              }`}
            >
              {row.action ?? row.date}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
