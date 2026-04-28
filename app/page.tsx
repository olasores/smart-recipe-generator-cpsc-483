import { LandingHero } from "@/components/landing-hero";
// import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.14),_transparent_28%),linear-gradient(180deg,_#fffaf7_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        

        <LandingHero
          title="Turn random ingredients into dinner in one click."
          description="Clean recipe suggestions based on what you already have, how much time you have, and what you actually want to eat."
          ctaLabel="Generate a recipe"
          ctaHref="#"
          note="Fast. simple. no clutter."
        />
      </div>
    </main>
  );
}
