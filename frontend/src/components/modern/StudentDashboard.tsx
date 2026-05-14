import { useEffect, useState } from "react";
import { StudentDashboardSkeleton } from "./Skeleton";

interface DashboardData {
  studentName: string;
  appliedCount: number;
  shortlistedCount: number;
  formsDue: number;
  recentCompanies: Array<{
    id: string;
    name: string;
    status: "Applied" | "Pending" | "Eligible";
  }>;
}

const statusClass: Record<DashboardData["recentCompanies"][number]["status"], string> = {
  Applied: "bg-[#10805b]",
  Pending: "bg-[#8d8214]",
  Eligible: "bg-[#1e3ba3]",
};

export function ModernStudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        studentName: "<Student Name>",
        appliedCount: 2,
        shortlistedCount: 1,
        formsDue: 2,
        recentCompanies: [
          { id: "1", name: "Infosys", status: "Applied" },
          { id: "2", name: "NetApp", status: "Pending" },
          { id: "3", name: "PhonePe", status: "Eligible" },
        ],
      });
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !data) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-8 w-full text-left">
        <h1 className="mb-2 text-[2.5rem] font-bold leading-none text-gray-900">
          Hello,<br />{data.studentName}
        </h1>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Here is your placement overview!
        </p>
        <button
          type="button"
          className="mt-1 rounded text-left text-sm text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Verify your profile
        </button>
      </div>

      <div className="mb-6 flex w-full justify-center gap-4">
        <StatCard label="Applied" value={data.appliedCount} caption="Companies" />
        <StatCard label="Shortlisted" value={data.shortlistedCount} caption="In Progress" />
      </div>

      <div className="mx-auto mb-8 flex w-max items-center gap-4 rounded-full border border-slate-200 dark:border-white/5 bg-[#1e1e1e] px-6 py-2 shadow-xl animate-in zoom-in duration-500 delay-300">
        <span className="text-sm font-bold uppercase tracking-widest text-red-400">
          Forms Due
        </span>
        <span className="text-2xl font-semibold text-slate-900 dark:text-white">{data.formsDue}</span>
      </div>

      <div className="relative w-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-[#333333] p-4 shadow-2xl">
        <h3 className="mb-3 px-2 text-sm font-medium text-slate-900 dark:text-white">Recent Companies</h3>
        <div className="flex flex-col gap-2">
          {data.recentCompanies.map((company, index) => (
            <div
              key={company.id}
              className="flex items-center justify-between rounded-full border border-slate-200 dark:border-white/5 bg-[#1a1a1a] px-5 py-3 animate-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: `${400 + index * 100}ms` }}
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{company.name}</span>
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-white ${statusClass[company.status]}`}
              >
                {company.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="flex size-[140px] flex-col items-center justify-center rounded-3xl border border-slate-200 dark:border-white/5 bg-[#1e1e1e] shadow-xl animate-in slide-in-from-bottom-4 duration-500">
      <span className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">{label}</span>
      <span className="text-6xl font-semibold leading-none text-slate-900 dark:text-white">{value}</span>
      <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">
        {caption}
      </span>
    </div>
  );
}
