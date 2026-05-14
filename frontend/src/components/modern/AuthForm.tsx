import { useEffect, useState } from "react";
import { LoadingRegion, Skeleton } from "./Skeleton";
import { cn } from "@/lib/utils";

export function ModernAuthForm() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"student" | "spc">("student");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleRoleChange = (newRole: "student" | "spc") => {
    setLoading(true);
    setRole(newRole);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 mt-12">
      <div className="bg-[#444444] rounded-[2rem] p-6 shadow-2xl w-full border border-slate-200 dark:border-white/10 relative overflow-hidden" aria-busy={loading}>
        <div className="bg-[#d2eaff] rounded-full p-1.5 flex mb-8 relative" role="tablist" aria-label="Select sign in role">
          <button 
            type="button"
            role="tab"
            aria-selected={role === "student"}
            onClick={() => handleRoleChange("student")}
            disabled={loading}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-semibold transition-all z-10",
              role === "student" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
            )}
          >
            Student
          </button>
          <button 
            type="button"
            role="tab"
            aria-selected={role === "spc"}
            onClick={() => handleRoleChange("spc")}
            disabled={loading}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-semibold transition-all z-10",
              role === "spc" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
            )}
          >
            SPC
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <LoadingRegion label="Loading sign in form" className="space-y-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
              {role === "spc" && <Skeleton className="h-14 w-full rounded-2xl" />}
              <Skeleton tone="blue" className="h-12 w-full rounded-2xl mt-4" />
            </LoadingRegion>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {role === "student" ? (
                <>
                  <p className="text-gray-300 text-xs text-center mb-2">Sign in with your RVCE Google account</p>
                  <button type="button" className="w-full bg-[#0066cc] text-slate-900 dark:text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#444444]">
                    <div className="bg-white rounded-full p-1 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    Continue with Google
                  </button>
                </>
              ) : (
                <>
                  <input 
                    type="text" 
                    aria-label="SPC username"
                    autoComplete="username"
                    placeholder="Username" 
                    className="w-full bg-[#f0f7ff] text-gray-800 placeholder-gray-500 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                  <input 
                    type="password" 
                    aria-label="SPC password"
                    autoComplete="current-password"
                    placeholder="Password" 
                    className="w-full bg-[#f0f7ff] text-gray-800 placeholder-gray-500 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                  <button type="button" className="w-full bg-[#0066cc] text-slate-900 dark:text-white font-semibold rounded-2xl py-4 mt-2 hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#444444]">
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
