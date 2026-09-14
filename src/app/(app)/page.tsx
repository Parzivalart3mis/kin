import { AppHeader } from "@/components/app/app-header";
import { TodayList } from "@/components/today/today-list";

export const dynamic = "force-dynamic";

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
}

export default function TodayPage() {
  return (
    <>
      <AppHeader title="Today" subtitle={todayLabel()} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 page-main">
        <TodayList />
      </main>
    </>
  );
}
