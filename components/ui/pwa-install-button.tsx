"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { usePwa } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function PwaInstallButton({
  className,
  compact = false,
  variant = "outline"
}: Props) {
  const { canInstall, installed, promptInstall } = usePwa();
  const [pending, setPending] = useState(false);

  if (!canInstall && !installed) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={pending || installed}
      onClick={async () => {
        setPending(true);
        try {
          await promptInstall();
        } finally {
          setPending(false);
        }
      }}
      type="button"
      variant={installed ? "secondary" : variant}
    >
      <Download className="h-4 w-4" />
      <span>{installed ? "Installed" : pending ? "Installing…" : compact ? "Install" : "Install app"}</span>
    </Button>
  );
}
