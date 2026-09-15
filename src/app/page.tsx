import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/landing";

export const dynamic = "force-dynamic";

/** Public landing. Signed-in visitors go straight to the app. */
export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/today");
  return <Landing />;
}
