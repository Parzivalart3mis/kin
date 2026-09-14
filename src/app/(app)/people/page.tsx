import { Plus } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app/app-header";
import { PeopleList } from "@/components/people/people-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PeoplePage() {
  return (
    <>
      <AppHeader
        title="People"
        action={
          <Button asChild size="icon-lg" variant="outline" aria-label="Add someone" className="size-11">
            <Link href="/people/new">
              <Plus aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24">
        <PeopleList />
      </main>
    </>
  );
}
