import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SPCVerificationSkeleton } from "./Skeleton";

interface StudentVerification {
  id: string;
  name: string;
  usn: string;
  cgpa: string;
  backlogs: string;
  state: "pending" | "rejected";
}

export function ModernSPCDashboard() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentVerification[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStudents([
        { id: "1", name: "Abc", usn: "1RV25MC001", cgpa: "8.7", backlogs: "0", state: "pending" },
        { id: "2", name: "Def", usn: "1RV25MC014", cgpa: "7.9", backlogs: "0", state: "pending" },
        { id: "3", name: "Ghi", usn: "1RV25MC038", cgpa: "6.8", backlogs: "1", state: "rejected" },
        { id: "4", name: "Jkl", usn: "1RV25MC044", cgpa: "9.1", backlogs: "0", state: "pending" },
      ]);
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SPCVerificationSkeleton />;
  }

  return (
    <div className="flex w-full flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="mb-8 mt-6 text-center text-sm font-medium uppercase tracking-wide text-gray-500">
        Here is your placement overview!
      </p>

      <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/5 bg-[#1e1e1e] p-5 shadow-2xl">
        <div className="mb-4 grid grid-cols-[1fr_1fr_0.8fr_0.9fr_4rem] gap-2 px-2">
          {["Name", "USN", "CGPA", "Backlogs"].map((heading) => (
            <span key={heading} className="text-xs font-bold text-slate-900 dark:text-white">
              {heading}
            </span>
          ))}
          <span className="sr-only">Action</span>
        </div>

        <div className="mb-8 flex flex-col gap-3">
          {students.map((student, index) => (
            <div
              key={student.id}
              className="grid min-h-[46px] grid-cols-[1fr_1fr_0.8fr_0.9fr_4rem] items-center gap-2 rounded-full border border-slate-200 dark:border-white/5 bg-[#111] px-4 text-xs text-slate-900 dark:text-white animate-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: `${200 + index * 100}ms` }}
            >
              <span className="truncate font-semibold">{student.name}</span>
              <span className="truncate text-slate-600 dark:text-white/70">{student.usn}</span>
              <span className="text-center text-slate-600 dark:text-white/70">{student.cgpa}</span>
              <span className="text-center text-slate-600 dark:text-white/70">{student.backlogs}</span>
              {student.state === "rejected" ? (
                <span className="rounded-full bg-[#8c1818] px-2 py-1 text-center text-[10px] font-bold leading-tight text-slate-900 dark:text-white">
                  Not<br />Verified
                </span>
              ) : (
                <button
                  type="button"
                  className="rounded-full bg-[#10805b] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111]"
                >
                  Verify
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
          <label className="relative">
            <span className="sr-only">Search by USN</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-900 dark:text-white" />
            <input
              type="text"
              placeholder="Search USN"
              className="w-[180px] rounded-full border border-slate-200 dark:border-white/10 bg-[#111] py-2.5 pl-10 pr-6 text-sm font-semibold text-slate-900 dark:text-white placeholder-white focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </label>
          <button
            type="button"
            className="rounded-full bg-[#10805b] px-8 py-2.5 text-sm font-semibold text-slate-900 dark:text-white shadow-lg transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e]"
          >
            Export Sheets
          </button>
        </div>
      </div>
    </div>
  );
}
