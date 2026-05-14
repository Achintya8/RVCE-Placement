import { useEffect, useState } from "react";
import { Skeleton, StudentProfileSkeleton } from "./Skeleton";

interface StudentProfileData {
  name: string;
  usn: string;
  course: string;
  collegeEmail: string;
  personalEmail: string;
  phone: string;
  cgpa: string;
  tenthPercent: string;
  twelfthPercent: string;
  backlogs: string;
}

export function ModernStudentProfile() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfileData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        name: "<Name>",
        usn: "1RV25MC000",
        course: "MCA 1ST YEAR",
        collegeEmail: "<Email>",
        personalEmail: "<Email>",
        phone: "<Phone>",
        cgpa: "<CGPA>",
        tenthPercent: "<CGPA>",
        twelfthPercent: "<CGPA>",
        backlogs: "",
      });
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      {loading ? (
        <StudentProfileSkeleton />
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-[#1e1e1e] rounded-3xl p-6 shadow-2xl relative overflow-hidden text-slate-900 dark:text-white border border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-[1.35rem] bg-yellow-500 shadow-lg" />
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg leading-tight">Student Name</h2>
            <p className="text-xs text-gray-300 uppercase tracking-wider">{data?.usn} - {data?.course}</p>
            <button type="button" className="text-left text-xs text-red-400 mt-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e] rounded">
              Verify your profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
          <ProfileField label="Full Name:" value={data?.name} loading={loading} />
          <ProfileField label="College Email:" value={data?.collegeEmail} loading={loading} />
          <ProfileField label="Personal Email:" value={data?.personalEmail} loading={loading} />
          <ProfileField label="Phone:" value={data?.phone} loading={loading} />
          <ProfileField label="CGPA:" value={data?.cgpa} loading={loading} />
          <ProfileField label="10th %:" value={data?.tenthPercent} loading={loading} />
          <ProfileField label="12th %:" value={data?.twelfthPercent} loading={loading} />
          <ProfileField label="Active Backlogs:" value={data?.backlogs} loading={loading} />
        </div>
      </div>

      {/* Resume Section */}
      <div className="bg-[#2a2a2a] rounded-3xl p-5 shadow-lg border border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-900 dark:text-white font-medium text-sm">Resume</span>
          <button type="button" className="bg-[#107c54] text-slate-900 dark:text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2a]">
            Uploaded
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1a1a1a] rounded-full px-4 py-3 flex items-center justify-between border border-slate-200 dark:border-white/5">
            <span className="text-slate-900 dark:text-white text-sm font-medium">Resume.pdf</span>
          </div>
          <button type="button" className="bg-gray-300 text-gray-900 font-semibold text-sm px-6 py-3 rounded-full hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2a]">
            Replace
          </button>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

function ProfileField({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-400 text-xs mb-1">{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <span className="text-slate-900 dark:text-white text-sm font-medium">{value || "-"}</span>
      )}
    </div>
  );
}
