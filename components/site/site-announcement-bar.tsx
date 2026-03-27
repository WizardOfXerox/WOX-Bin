"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type AnnouncementTone = "info" | "success" | "warning" | "critical";

type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  tone: AnnouncementTone;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function toneClasses(tone: AnnouncementTone) {
  if (tone === "success") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-50";
  }
  if (tone === "warning") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-50";
  }
  if (tone === "critical") {
    return "border-red-400/25 bg-red-500/10 text-red-50";
  }
  return "border-sky-400/25 bg-sky-500/10 text-sky-50";
}

export function SiteAnnouncementBar() {
  const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch("/api/announcements/active", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { announcement?: AnnouncementRecord | null }) => {
        if (!alive) {
          return;
        }
        const nextAnnouncement = data.announcement ?? null;
        setAnnouncement(nextAnnouncement);
        if (!nextAnnouncement) {
          setDismissed(false);
          return;
        }
        try {
          setDismissed(window.localStorage.getItem(`wox-announcement-dismissed:${nextAnnouncement.id}`) === "1");
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setAnnouncement(null);
        setDismissed(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const ctaIsInternal = useMemo(
    () => Boolean(announcement?.ctaHref && announcement.ctaHref.startsWith("/")),
    [announcement]
  );

  if (!announcement || dismissed) {
    return null;
  }

  return (
    <div className={`mb-3 rounded-2xl border px-4 py-3 ${toneClasses(announcement.tone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-current/70">Announcement</p>
          <p className="mt-1 text-sm font-semibold text-current">{announcement.title}</p>
          <p className="mt-1 text-sm leading-6 text-current/80">{announcement.body}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {announcement.ctaHref && announcement.ctaLabel ? (
            ctaIsInternal ? (
              <Button asChild className="h-9 rounded-full px-4" size="sm" variant="secondary">
                <Link href={announcement.ctaHref}>{announcement.ctaLabel}</Link>
              </Button>
            ) : (
              <Button asChild className="h-9 rounded-full px-4" size="sm" variant="secondary">
                <a href={announcement.ctaHref} rel="noreferrer" target="_blank">
                  {announcement.ctaLabel}
                </a>
              </Button>
            )
          ) : null}
          <Button
            className="h-9 w-9 rounded-full border-current/15 bg-transparent text-current hover:bg-white/10"
            onClick={() => {
              try {
                window.localStorage.setItem(`wox-announcement-dismissed:${announcement.id}`, "1");
              } catch {
                // ignore storage failures
              }
              setDismissed(true);
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
