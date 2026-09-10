/**
 * Bascule de langue des pages légales TikTok.
 *
 * Ces deux pages sont lues par deux publics : les marchands francophones et
 * l'équipe de revue de TikTok, qui travaille en anglais. Les deux versions
 * sont donc rendues l'une sous l'autre dans le DOM — pas de JS, pas
 * d'affichage conditionnel — et ces ancres ne font que sauter à la bonne
 * section. Un relecteur qui ne clique rien voit quand même le texte anglais
 * en descendant.
 */
export function LangSwitch({ active }: { active: "fr" | "en" }) {
  return (
    <nav aria-label="Langue / Language" className="mb-8 flex flex-wrap gap-2">
      <LangLink href="#fr" label="Français" current={active === "fr"} />
      <LangLink href="#en" label="English" current={active === "en"} />
    </nav>
  );
}

function LangLink({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={current ? "true" : undefined}
      className={`lang-pill inline-flex min-h-tap items-center rounded-pill border px-5 text-[15px] font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        current ? "border-accent bg-accent" : "border-line hover:border-ink3"
      }`}
    >
      {label}
    </a>
  );
}
