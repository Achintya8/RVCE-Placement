import { useEffect, useState } from "react";
import { ApplicationFormSkeleton } from "./Skeleton";

export function ModernApplicationForm() {
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <ApplicationFormSkeleton />;
  }

  return (
    <section className="min-h-[460px] rounded-[2rem] bg-[#121212] p-6 text-slate-900 dark:text-white shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-sm font-medium text-slate-700 dark:text-white/80">Application Form</p>
      <h2 className="mb-14 text-xl font-bold leading-none">Company Name</h2>

      <fieldset className="space-y-4">
        <legend className="mx-auto w-full max-w-xs rounded-full border border-slate-200 dark:border-white/10 bg-[#0b0b0b] px-5 py-3 text-center text-xs font-bold shadow-inner">
          Do you Consent to appear for this Interview??
        </legend>

        <div className="mx-auto grid w-full max-w-[180px] gap-3">
          <button
            type="button"
            aria-pressed={consent === "yes"}
            onClick={() => setConsent("yes")}
            className={`h-9 rounded-full border border-slate-200 dark:border-white/10 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
              consent === "yes" ? "bg-[#10805b] text-slate-900 dark:text-white" : "bg-[#0b0b0b] text-slate-600 dark:text-white/70"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            aria-pressed={consent === "no"}
            onClick={() => setConsent("no")}
            className={`h-9 rounded-full border border-slate-200 dark:border-white/10 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
              consent === "no" ? "bg-[#8c1818] text-slate-900 dark:text-white" : "bg-[#0b0b0b] text-slate-600 dark:text-white/70"
            }`}
          >
            No
          </button>
        </div>
      </fieldset>
    </section>
  );
}
