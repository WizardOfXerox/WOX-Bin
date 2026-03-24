"use client";

import Link from "next/link";

import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { formatPlanName, type PlanId } from "@/lib/plans";

type Props = {
  plan: PlanId;
  currentPath: string;
};

function navItemActive(currentPath: string, href: string) {
  if (href === "/settings/team") {
    return currentPath === "/settings/team";
  }
  return currentPath === href;
}

export function SettingsNav({ plan, currentPath }: Props) {
  const { t } = useUiLanguage();

  const groups = [
    {
      title: t("settings.group.account"),
      items: [{ href: "/settings/account", label: t("settings.profile") }]
    },
    {
      title: t("settings.group.plan"),
      items: [
        { href: "/settings/billing", label: t("settings.billing") },
        { href: "/settings/usage", label: t("settings.usage") }
      ]
    },
    {
      title: t("settings.group.security"),
      items: [{ href: "/settings/sessions", label: t("settings.sessions") }]
    },
    {
      title: t("settings.group.help"),
      items: [
        { href: "/help", label: t("nav.help") },
        { href: "/support", label: t("nav.support") }
      ]
    },
    {
      title: t("settings.group.integrations"),
      items: [
        { href: "/settings/webhooks", label: t("settings.webhooks") },
        { href: "/settings/migrate-pastebin", label: t("settings.pastebinImport") }
      ]
    },
    {
      title: t("settings.group.team"),
      items: [
        { href: "/settings/team", label: t("settings.team") },
        { href: "/settings/team/pastes", label: t("settings.teamPastes") }
      ]
    }
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("settings.title")}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("settings.accountTitle")}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t("settings.accountDescription")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher compact />
            <Badge className={plan === "free" ? undefined : "border-amber-400/30 bg-amber-400/10 text-amber-100"}>
              {formatPlanName(plan)} plan
            </Badge>
            <Button asChild variant="ghost">
              <Link href="/help">{t("nav.help")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/support">{t("nav.support")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app">{t("settings.backToWorkspace")}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.title}</p>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    className="h-9 w-full justify-start px-3 font-normal"
                    size="sm"
                    variant={navItemActive(currentPath, item.href) ? "default" : "ghost"}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
