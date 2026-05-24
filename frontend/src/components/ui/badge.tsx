import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white shadow-[0_6px_18px_rgba(0,122,255,0.22)]",
        secondary: "border-white/60 bg-white/45 text-slate-900 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "border-white/60 bg-white/25 text-slate-900 backdrop-blur-xl dark:border-white/20 dark:text-white",
        success: "border-transparent bg-green-500/20 text-green-600 dark:text-green-300",
        warning: "border-transparent bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
