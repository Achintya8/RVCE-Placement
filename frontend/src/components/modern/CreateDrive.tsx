import { useEffect, useState } from "react";
import { CreateDriveSkeleton } from "./Skeleton";

const fields = [
  "Company Name",
  "CTC",
  "MIN CGPA",
  "BACKLOGS (MAX)",
  "Application Deadline",
];

export function ModernCreateDrive() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <CreateDriveSkeleton />;
  }

  return (
    <form className="rounded-[2rem] bg-[#121212] p-6 text-slate-900 dark:text-white shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field} className="block">
            <span className="sr-only">{field}</span>
            <input
              type="text"
              placeholder={field}
              className="h-11 w-full rounded-full border border-slate-200 dark:border-white/10 bg-[#0b0b0b] px-5 text-sm text-slate-900 dark:text-white placeholder:text-white/85 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
        ))}

        <label className="block">
          <span className="sr-only">Job Description</span>
          <textarea
            placeholder="Job Description"
            rows={3}
            className="min-h-20 w-full resize-none rounded-[1.75rem] border border-slate-200 dark:border-white/10 bg-[#0b0b0b] px-5 py-4 text-sm text-slate-900 dark:text-white placeholder:text-white/85 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
      </div>

      <button
        type="button"
        className="mx-auto mt-8 block rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3 text-sm font-bold text-slate-900 dark:text-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
      >
        Create Drive
      </button>
    </form>
  );
}
