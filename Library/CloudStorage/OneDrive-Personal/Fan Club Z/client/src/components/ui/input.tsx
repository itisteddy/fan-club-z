import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ios'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    const baseClasses = "flex w-full rounded-[10px] text-body transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    
    const variantClasses = {
      default: "h-11 border-0 bg-gray-100 px-4 py-3 placeholder:text-sm placeholder:truncate focus:bg-gray-200 focus:ring-2 focus:ring-blue-500/20",
      ios: "h-[50px] border border-gray-200 bg-white px-4 py-3 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2"
    }
    
    return (
      <input
        type={type}
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
