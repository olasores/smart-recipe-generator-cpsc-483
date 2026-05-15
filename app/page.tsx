import { LandingContent } from "@/components/landing-content";
import { getUser } from "@/lib/auth";

export default async function Home() {
  const user = await getUser();
  return <LandingContent userEmail={user?.email ?? null} />;
}
