import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-border bg-card/80 shadow-[0_16px_48px_rgba(15,23,42,0.09)] backdrop-blur transition-all duration-300 ease-wox-out dark:shadow-[0_20px_60px_rgba(0,0,0,0.22)] motion-safe:hover:border-primary/20 motion-safe:hover:shadow-[0_20px_56px_rgba(15,23,42,0.12)] dark:motion-safe:hover:shadow-[0_24px_72px_rgba(0,0,0,0.28)]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
