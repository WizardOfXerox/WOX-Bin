"use client";

import { useCallback, useRef, useState, type DragEvent, type HTMLAttributes, type ReactNode } from "react";

import { dataTransferHasFiles } from "@/lib/file-drop";
import { cn } from "@/lib/utils";

export type FileDropSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  /** Receives dropped files (empty drags are ignored). */
  onFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  /** Applied to the wrapper while a file drag is active over the zone. */
  activeClassName?: string;
  /** Optional message on the glass overlay (pointer-events: none). */
  overlayMessage?: string;
  overlayClassName?: string;
  children: ReactNode;
};

/**
 * Drop zone with drag-enter/leave depth counting and an optional overlay.
 * Use for workspace import, PDF tool, media attachments, etc.
 */
export function FileDropSurface({
  onFiles,
  disabled,
  className,
  activeClassName,
  overlayMessage,
  overlayClassName,
  children,
  ...props
}: FileDropSurfaceProps) {
  const depth = useRef(0);
  const [active, setActive] = useState(false);

  const resetDepth = useCallback(() => {
    depth.current = 0;
    setActive(false);
  }, []);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled || !dataTransferHasFiles(e.dataTransfer)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      depth.current += 1;
      setActive(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setActive(false);
      }
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled || !dataTransferHasFiles(e.dataTransfer)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      resetDepth();
      const list = e.dataTransfer?.files;
      if (list?.length) {
        void onFiles(Array.from(list));
      }
    },
    [disabled, onFiles, resetDepth]
  );

  return (
    <div
      className={cn("relative", className, active && activeClassName)}
      onDragEnter={disabled ? undefined : onDragEnter}
      onDragLeave={disabled ? undefined : onDragLeave}
      onDragOver={disabled ? undefined : onDragOver}
      onDrop={disabled ? undefined : onDrop}
      {...props}
    >
      {children}
      {active && overlayMessage ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-[5] flex items-center justify-center rounded-[inherit] border-2 border-dashed border-primary/80 bg-primary/10 px-4 text-center text-sm font-medium text-primary shadow-inner backdrop-blur-[2px]",
            overlayClassName
          )}
        >
          {overlayMessage}
        </div>
      ) : null}
    </div>
  );
}
