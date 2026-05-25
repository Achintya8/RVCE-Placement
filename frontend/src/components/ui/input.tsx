import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onFocus, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "ios-glass-control flex h-11 w-full rounded-2xl px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:placeholder:text-slate-400",
          className
        )}
        ref={ref}
        onFocus={(e) => {
          const val = props.value;
          if (val !== undefined && val !== null && val !== "" && Number(val) === 0) {
            e.target.value = "";
            props.onChange?.(e);
          }
          onFocus?.(e);
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
