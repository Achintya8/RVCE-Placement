import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CompanyListSkeleton } from "./Skeleton";

type CompanyStatus = "eligible" | "notEligible" | "applied";

interface CompanyItem {
  id: string;
  name: string;
  role: string;
  deadline: string;
  status: CompanyStatus;
}

const statusCopy: Record<CompanyStatus, { badge: string; action: string; className: string }> = {
  eligible: {
    badge: "Eligible",
    action: "Apply",
    className: "bg-gradient-to-r from-lime-600 to-lime-800",
  },
  notEligible: {
    badge: "Not Eligible",
    action: "Ineligible",
    className: "bg-gradient-to-r from-[#8c1818] to-[#501010]",
  },
  applied: {
    badge: "Eligible",
    action: "Applied",
    className: "bg-gradient-to-r from-blue-600 to-blue-900",
  },
};

export function ModernCompaniesList() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCompanies([
        { id: "1", name: "Infosys", role: "NA", deadline: "10th May", status: "eligible" },
        { id: "2", name: "NetApp", role: "NA", deadline: "10th May", status: "notEligible" },
        { id: "3", name: "PhonePe", role: "NA", deadline: "10th May", status: "applied" },
      ]);
      setLoading(false);
    }, 1700);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <CompanyListSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {companies.map((company, index) => {
        const copy = statusCopy[company.status];
        return (
          <article
            key={company.id}
            className="flex items-center gap-4 rounded-[1.75rem] bg-[#121212] p-4 text-slate-900 dark:text-white shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="size-16 shrink-0 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-inner" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold">{company.name}</h2>
              <p className="text-sm font-semibold">Role: {company.role}</p>
              <p className="text-xs font-semibold text-white/85">Deadline : {company.deadline}</p>
            </div>
            <div className="flex w-28 shrink-0 flex-col items-stretch gap-2">
              <span className={`rounded-full px-3 py-1.5 text-center text-xs font-bold ${copy.className}`}>
                {copy.badge}
              </span>
              <button
                type="button"
                disabled={company.status !== "eligible"}
                className={`flex items-center justify-center gap-1 rounded-full px-3 py-2.5 text-sm font-bold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
                  company.status === "eligible"
                    ? "bg-gradient-to-r from-lime-600 to-lime-800 hover:scale-[1.02]"
                    : company.status === "applied"
                      ? "bg-gradient-to-r from-blue-600 to-blue-900"
                      : "border border-white/15 bg-[#111] text-slate-700 dark:text-white/80"
                }`}
              >
                {copy.action}
                {company.status === "eligible" && <ArrowRight className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
