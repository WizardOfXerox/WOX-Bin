import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPlanName, type PlanId } from "@/lib/plans";

type Props = {
  plan: PlanId;
  currentPath: string;
};

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Account",
    items: [{ href: "/settings/account", label: "Profile" }]
  },
  {
    title: "Plan & usage",
    items: [
      { href: "/settings/billing", label: "Billing" },
      { href: "/settings/usage", label: "Usage" }
    ]
  },
  {
    title: "Security",
    items: [{ href: "/settings/sessions", label: "Sessions" }]
  },
  {
    title: "Help",
    items: [
      { href: "/help", label: "Help" },
      { href: "/support", label: "Support" }
    ]
  },
  {
    title: "Integrations",
    items: [
      { href: "/settings/webhooks", label: "Webhooks" },
      { href: "/settings/migrate-pastebin", label: "Pastebin import" }
    ]
  },
  {
    title: "Team",
    items: [
      { href: "/settings/team", label: "Team" },
      { href: "/settings/team/pastes", label: "Team pastes" }
    ]
  }
];

function navItemActive(currentPath: string, href: string) {
  if (href === "/settings/team") {
    return currentPath === "/settings/team";
  }
  return currentPath === href;
}

export function SettingsNav({ plan, currentPath }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Settings</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Your account</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Profile, billing, devices, webhooks, and team tools — grouped below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={plan === "free" ? undefined : "border-amber-400/30 bg-amber-400/10 text-amber-100"}>
              {formatPlanName(plan)} plan
            </Badge>
            <Button asChild variant="ghost">
              <Link href="/help">Help</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/support">Support</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app">Back to workspace</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {GROUPS.map((group) => (
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
