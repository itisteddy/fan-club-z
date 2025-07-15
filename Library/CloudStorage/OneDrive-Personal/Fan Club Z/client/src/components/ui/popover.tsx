import * as React from "react"
import { cn } from "../../lib/utils"

const Popover = ({ children }: { children: React.ReactNode }) => {
  return <div className="relative">{children}</div>
}

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean
  }
>(({ className, children, asChild = false, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      ...props,
    } as any)
  }
  
  return (
    <button
      ref={ref}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "right" | "bottom" | "left"
    align?: "start" | "center" | "end"
  }
>(({ className, side = "bottom", align = "center", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-950 shadow-md",
      side === "top" && "bottom-full mb-2",
      side === "bottom" && "top-full mt-2",
      side === "left" && "right-full mr-2",
      side === "right" && "left-full ml-2",
      align === "start" && "left-0",
      align === "end" && "right-0",
      align === "center" && "left-1/2 transform -translate-x-1/2",
      className
    )}
    {...props}
  />
))
PopoverContent.displayName = "PopoverContent"

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
}