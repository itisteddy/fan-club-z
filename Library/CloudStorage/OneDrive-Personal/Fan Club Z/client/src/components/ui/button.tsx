import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-body font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 select-none",
  {
    variants: {
      variant: {
        default: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm active:shadow-none",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm active:shadow-none",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm active:shadow-none",
        ghost: "hover:bg-gray-100 active:bg-gray-200",
        link: "text-blue-500 underline-offset-4 hover:underline active:text-blue-600",
        apple: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm active:shadow-none",
        "apple-secondary": "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm active:shadow-none",
      },
      size: {
        default: "h-[50px] px-6 py-3",
        sm: "h-11 px-4 py-2.5 text-body-sm",
        lg: "h-14 px-8 py-4 text-body-lg",
        icon: "h-11 w-11",
        "apple-sm": "h-11 px-4 py-2.5 text-body-sm",
        apple: "h-[50px] px-6 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
