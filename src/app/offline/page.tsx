import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline — Kin" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <WifiOff className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <h1 className="text-xl font-semibold">You&rsquo;re offline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page isn&rsquo;t saved yet. Today&rsquo;s list still is, if you&rsquo;ve opened it before.
        </p>
      </div>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/today">Open today&rsquo;s list</Link>
      </Button>
    </main>
  );
}
