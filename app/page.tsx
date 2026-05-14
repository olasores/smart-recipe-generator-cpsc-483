import { LandingHero } from "@/components/landing-hero";
import AuthNav from "@/components/AuthNav";

export default function Home() {
  return (
    <main className="min-h-screen relative bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.14),_transparent_28%),linear-gradient(180deg,_#fffaf7_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50">
        <AuthNav />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
        

        <LandingHero
          title="Turn random ingredients into dinner in one click."
          description="Clean recipe suggestions based on what you already have, how much time you have, and what you actually want to eat."
          ctaLabel="Generate a recipe"
          ctaHref="/get-started"
          note="Fast. simple. no clutter."
        />
      </div>
    </main>
  );
}
