import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-border bg-card/80 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow,background-color] duration-200 ease-wox-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:hover:border-primary/25",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
