import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 ease-wox-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 motion-safe:active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glow hover:opacity-95 hover:shadow-[0_12px_40px_hsl(var(--primary)/0.35)] motion-safe:hover:-translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85 motion-safe:hover:-translate-y-px",
        ghost:
          "bg-transparent text-foreground hover:bg-white/10 motion-safe:hover:-translate-y-px dark:hover:bg-white/[0.08]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-white/5 motion-safe:hover:-translate-y-px dark:hover:bg-white/[0.06]",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-95 motion-safe:hover:-translate-y-px"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
