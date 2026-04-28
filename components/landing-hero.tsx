type LandingHeroProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  note: string;
};

export function LandingHero({ title, description, ctaLabel, ctaHref, note }: LandingHeroProps) {
  return (
    <section id="hero" className="flex flex-1 items-center justify-center py-14 text-center sm:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
          Smart Recipe Generator
        </p>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
          {description}
        </p>

        <div className="mt-8 flex justify-center">
          <a
            href={ctaHref}
            className="inline-flex h-12 items-center justify-center rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500"
          >
            {ctaLabel}
          </a>
        </div>

        <p className="mt-6 text-sm text-stone-500">{note}</p>
      </div>
    </section>
  );
}
