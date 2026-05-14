import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SkeletonTone = "dark" | "light" | "soft" | "green" | "blue" | "gold" | "red";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  shimmer?: boolean;
  tone?: SkeletonTone;
}

const toneClasses: Record<SkeletonTone, string> = {
  dark: "bg-slate-200 dark:bg-white/10",
  light: "bg-slate-200/80",
  soft: "bg-sky-100/80",
  green: "bg-emerald-500/25",
  blue: "bg-blue-500/25",
  gold: "bg-yellow-500/25",
  red: "bg-red-500/25",
};

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

export function Skeleton({
  className,
  children,
  shimmer = true,
  tone = "dark",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rv-skeleton relative overflow-hidden rounded-md",
        toneClasses[tone],
        !shimmer && "rv-skeleton-static",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  tone = "dark",
  className,
}: {
  lines?: number;
  tone?: SkeletonTone;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {range(lines).map((line) => (
        <Skeleton
          key={line}
          tone={tone}
          className={cn(
            "h-3 rounded-full",
            line === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <LoadingRegion label="Loading sign in controls" className="w-full">
      <div className="rounded-[2rem] bg-[#3f4245] p-6 shadow-2xl">
        <div className="mb-8 grid grid-cols-2 gap-2 rounded-full bg-[#dbeeff] p-1.5">
          <Skeleton tone="soft" className="h-11 rounded-full bg-white" />
          <Skeleton tone="soft" className="h-11 rounded-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton tone="blue" className="h-11 rounded-2xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function StudentProfileSkeleton() {
  return (
    <LoadingRegion label="Loading student profile" className="space-y-5">
      <div className="rounded-[2rem] bg-[#121212] p-5 shadow-2xl ring-1 ring-white/10">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton tone="gold" className="size-20 shrink-0 rounded-[1.65rem]" />
          <div className="w-full min-w-0 space-y-2">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-3 w-44 rounded-full" />
            <Skeleton tone="red" className="h-3 w-28 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-7 gap-y-7">
          {range(8).map((item) => (
            <div key={item} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.75rem] bg-[#303030] p-4 shadow-xl ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton tone="green" className="h-8 w-28 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton tone="light" className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <LoadingRegion label="Loading student dashboard" className="space-y-6">
      <div className="space-y-3">
        <Skeleton tone="light" className="h-10 w-3/4 rounded-full" />
        <Skeleton tone="light" className="h-3 w-2/3 rounded-full" />
        <Skeleton tone="light" className="h-3 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="aspect-square rounded-[1.75rem]" />
        <Skeleton className="aspect-square rounded-[1.75rem]" />
      </div>
      <Skeleton className="mx-auto h-11 w-40 rounded-full" />
      <div className="rounded-[1.75rem] bg-[#303030] p-4 shadow-2xl">
        <Skeleton className="mb-3 h-4 w-36 rounded-full" />
        <div className="space-y-2">
          {range(3).map((row) => (
            <Skeleton key={row} className="h-11 rounded-full" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SPCVerificationSkeleton() {
  return (
    <LoadingRegion label="Loading verification table" className="space-y-6">
      <Skeleton tone="light" className="mx-auto h-3 w-64 rounded-full" />
      <div className="rounded-[2rem] bg-[#121212] p-5 shadow-2xl ring-1 ring-white/10">
        <div className="mb-4 grid grid-cols-4 gap-3 px-2">
          {range(4).map((heading) => (
            <Skeleton key={heading} className="h-3 rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {range(4).map((row) => (
            <Skeleton key={row} className="h-11 rounded-full" />
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton tone="green" className="h-10 w-40 rounded-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SPCOverviewSkeleton() {
  return (
    <LoadingRegion label="Loading SPC dashboard" className="space-y-6">
      <Skeleton tone="light" className="mx-auto h-3 w-64 rounded-full" />
      <div className="grid grid-cols-2 gap-4">
        {(["dark", "green", "blue", "gold"] as SkeletonTone[]).map((tone) => (
          <Skeleton key={tone} tone={tone} className="h-20 rounded-[1.75rem]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {range(2).map((card) => (
          <div key={card} className="rounded-[1.5rem] bg-[#303030] p-3 shadow-xl">
            <Skeleton className="mb-3 h-4 w-32 rounded-full" />
            <div className="space-y-2">
              {range(3).map((row) => (
                <Skeleton key={row} className="h-11 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function CompanyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading companies" className="space-y-5">
      {range(count).map((company) => (
        <div
          key={company}
          className="flex items-center gap-4 rounded-[1.75rem] bg-[#121212] p-4 shadow-2xl ring-1 ring-white/10"
        >
          <Skeleton tone="light" className="size-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
          <div className="w-24 space-y-2">
            <Skeleton tone="green" className="h-7 rounded-full" />
            <Skeleton tone={company === 1 ? "red" : "blue"} className="h-9 rounded-full" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ApplicationFormSkeleton() {
  return (
    <LoadingRegion label="Loading application form">
      <div className="min-h-[460px] rounded-[2rem] bg-[#121212] p-6 shadow-2xl ring-1 ring-white/10">
        <Skeleton className="mb-2 h-3 w-28 rounded-full" />
        <Skeleton className="mb-14 h-5 w-40 rounded-full" />
        <Skeleton className="mx-auto mb-4 h-10 w-full max-w-xs rounded-full" />
        <Skeleton className="mx-auto mb-3 h-5 w-44 rounded-full" />
        <Skeleton className="mx-auto h-5 w-44 rounded-full" />
      </div>
    </LoadingRegion>
  );
}

export function CreateDriveSkeleton() {
  return (
    <LoadingRegion label="Loading create drive form">
      <div className="rounded-[2rem] bg-[#121212] p-6 shadow-2xl ring-1 ring-white/10">
        <div className="space-y-3">
          {range(6).map((field) => (
            <Skeleton
              key={field}
              className={cn("h-11 rounded-full", field === 5 && "h-16 rounded-[1.75rem]")}
            />
          ))}
        </div>
        <Skeleton tone="green" className="mx-auto mt-8 h-10 w-36 rounded-full" />
      </div>
    </LoadingRegion>
  );
}

export function FormsPanelSkeleton() {
  return (
    <LoadingRegion label="Loading placement forms" className="grid grid-cols-1 gap-5">
      {range(3).map((form) => (
        <div key={form} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
            </div>
            <Skeleton tone="blue" className="h-10 w-28 rounded-lg" />
          </div>
          <div className="flex gap-4 border-t border-slate-200 dark:border-white/10 pt-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function AdminPanelSkeleton() {
  return (
    <LoadingRegion label="Loading admin dashboard" className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 rounded-full" />
        <Skeleton className="h-4 w-80 max-w-full rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {range(4).map((stat) => (
          <div key={stat} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5">
            <Skeleton className="mb-4 h-3 w-28 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5">
        <Skeleton className="mb-5 h-6 w-40 rounded-full" />
        <div className="space-y-3">
          {range(5).map((row) => (
            <Skeleton key={row} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
