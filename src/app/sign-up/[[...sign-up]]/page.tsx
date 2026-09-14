import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Kin</h1>
        <p className="mt-1 text-sm text-muted-foreground">One daily list of who to call.</p>
      </div>
      <SignUp />
    </main>
  );
}
