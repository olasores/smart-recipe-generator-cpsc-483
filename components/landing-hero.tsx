import Link from "next/link";

type LandingHeroProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  note: string;
};

export function LandingHero({ title, description, ctaLabel, ctaHref, note }: LandingHeroProps) {
  return (
    <section id="hero" className="flex flex-1 items-center justify-center py-12 text-center sm:py-20">
      <div className="max-w-3xl px-1 sm:px-0">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
          Smart Recipe Generator
        </p>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 sm:mt-6 sm:text-6xl lg:text-7xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:mt-5 sm:text-lg sm:leading-8 lg:text-xl">
          {description}
        </p>

        <div className="mt-7 flex justify-center sm:mt-8">
          <Link
            href={ctaHref}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 sm:w-auto"
          >
            {ctaLabel}
          </Link>
        </div>

        <p className="mt-5 text-sm text-stone-500 sm:mt-6">{note}</p>
      </div>
    </section>
  );
}
