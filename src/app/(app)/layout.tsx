import { BottomNav } from "@/components/app/bottom-nav";
import { TimezoneSync } from "@/components/app/timezone-sync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <TimezoneSync />
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
