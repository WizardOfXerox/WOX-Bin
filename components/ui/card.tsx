import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-border bg-card/96 shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-wox-out dark:shadow-[0_18px_48px_rgba(0,0,0,0.18)] motion-safe:hover:border-primary/20 motion-safe:hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)] dark:motion-safe:hover:shadow-[0_22px_56px_rgba(0,0,0,0.24)]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
