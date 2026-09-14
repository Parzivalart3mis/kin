"use client";

import { Phone, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Today", icon: Phone, match: (p: string) => p === "/" },
  { href: "/people", label: "People", icon: Users, match: (p: string) => p.startsWith("/people") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 select-none"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
