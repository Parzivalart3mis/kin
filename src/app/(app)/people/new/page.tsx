import { AppHeader } from "@/components/app/app-header";
import { PersonForm } from "@/components/people/person-form";
import { listCountries } from "@/lib/countries";
import { requireUser } from "@/lib/auth";
import { guessCountry } from "@/lib/guess-country";

export const dynamic = "force-dynamic";

export default async function NewPersonPage() {
  const user = await requireUser();
  return (
    <>
      <AppHeader title="Add someone" />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24">
        <PersonForm countries={listCountries()} defaultCountry={guessCountry(user.timezone)} />
      </main>
    </>
  );
}
