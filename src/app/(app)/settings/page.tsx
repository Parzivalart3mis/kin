import { SignOutButton } from "@clerk/nextjs";
import { AppHeader } from "@/components/app/app-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="Settings" />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-24">
        <SettingsForm />
        <div className="border-t border-border pt-6">
          <SignOutButton redirectUrl="/sign-in">
            <Button variant="outline" className="min-h-11 w-full">
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </main>
    </>
  );
}
