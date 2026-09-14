import { notFound } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app/app-header";
import { DeletePersonButton } from "@/components/people/delete-person-button";
import { PersonForm } from "@/components/people/person-form";
import { requireUser } from "@/lib/auth";
import { listCountries } from "@/lib/countries";
import { toPersonDto } from "@/lib/dto";
import { AppError } from "@/lib/errors";
import { getPerson } from "@/lib/services/people";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  let person;
  try {
    person = await getPerson(user.id, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  return (
    <>
      <AppHeader title={person.name} />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-24">
        <PersonForm countries={listCountries()} person={toPersonDto(person)} defaultCountry={person.countryCode} />
        <div className="border-t border-border pt-6">
          <DeletePersonButton id={person.id} name={person.name} />
        </div>
      </main>
    </>
  );
}
