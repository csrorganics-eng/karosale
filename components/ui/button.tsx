import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[length:var(--radius-button)] text-sm font-semibold tracking-wide transition-[box-shadow,transform,background-color,color,opacity] duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] hover:brightness-[1.06]",
        warm:
          "bg-gradient-to-br from-accent-warm to-accent-warm-end text-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] hover:brightness-[1.05]",
        secondary: "bg-accent text-text-primary hover:bg-primary-muted/80",
        outline: "border border-border/80 bg-surface hover:border-primary/25 hover:bg-accent-soft",
        ghost: "hover:bg-accent-soft",
        destructive: "bg-error text-white shadow-[var(--shadow-soft)] hover:brightness-110",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-[length:var(--radius-input)] px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
