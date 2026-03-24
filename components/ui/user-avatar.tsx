"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  image?: string | null;
  label?: string | null;
  username?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl"
};

function initialsFromLabel(label: string | null | undefined, username: string | null | undefined) {
  const source = (label?.trim() || username?.trim() || "WOX-Bin").replace(/^@/, "");
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) {
    return "WB";
  }
  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function UserAvatar({
  image,
  label,
  username,
  className,
  size = "md"
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = image?.trim() || null;
  const initials = initialsFromLabel(label, username);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-primary/10 font-semibold text-primary",
        SIZE_CLASS[size],
        className
      )}
    >
      {src && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={src}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
