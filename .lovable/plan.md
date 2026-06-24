# Refonte visuelle "Émeraude Prestige" — Landing + App

Direction premium : vert émeraude profond + or champagne sur fond crème/ivoire, typographie éditoriale, finitions soignées. Intensité 3 — on retravaille design system, hero, sections clés et chrome de l'app, sans casser la structure ni la logique métier.

## Système de design (fondation)

Mise à jour de `src/index.css` et `tailwind.config.ts` uniquement — tous les composants existants héritent automatiquement.

**Palette (HSL, mode clair)**
- `--background` ivoire chaud `40 33% 97%` (#f5f0e0 base)
- `--foreground` vert nuit `158 78% 8%`
- `--primary` émeraude profond `158 78% 16%` (#064e3b)
- `--primary-glow` émeraude `160 80% 26%` (#0d7a5f) — pour dégradés
- `--accent` or champagne `43 56% 54%` (#c9a84c)
- `--accent-foreground` vert nuit
- `--card` blanc cassé `40 25% 99%`
- `--border` `40 20% 88%`
- `--muted` `40 20% 94%`
- `--ring` accent or

**Mode sombre**
- Fond `158 40% 6%`, surfaces `158 30% 10%`, accent or conservé, primary devient émeraude clair `160 70% 55%`.

**Tokens additionnels**
- `--gradient-hero` : `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))`
- `--gradient-gold` : `linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(43 70% 70%) 100%)`
- `--shadow-elegant` : `0 20px 50px -20px hsl(var(--primary) / 0.25)`
- `--shadow-gold` : `0 10px 30px -10px hsl(var(--accent) / 0.35)`

**Typographie** (via @fontsource, pas de CDN)
- Headings : **Fraunces** (serif éditorial moderne, optical sizing)
- Body : **Inter Tight** (sans neutre)
- Install : `@fontsource/fraunces`, `@fontsource-variable/inter-tight`
- Import dans `src/main.tsx`, mapping dans `tailwind.config.ts` (`font-display`, `font-sans`)

**Variantes Button** (ajout dans `button.tsx`)
- `premium` : `bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elegant hover:shadow-gold transition-all`
- `gold` : fond or, texte vert nuit, micro-ombre dorée

## Landing publique

Pages touchées : `Index.tsx`, `Software.tsx`, `PublicPricing.tsx`, `Comparison*.tsx`, `About.tsx`, `Contact.tsx`, `PublicNavigation.tsx`, `Footer.tsx`. Pas de refonte de structure — on retravaille hero + accents.

**Hero (Index.tsx)**
- Fond ivoire avec halo radial émeraude+or en arrière-plan (CSS `radial-gradient` via classe utilitaire)
- Eyebrow doré : "Logiciel de facturation premium" en petites majuscules letter-spaced
- Titre Fraunces 64px, italique sur un mot clé (ex. *prestige*)
- CTA principal en variante `premium`, secondaire en `outline`
- Aperçu dashboard avec ombre `shadow-elegant`, fine bordure dorée 1px, coins arrondis `rounded-2xl`
- Animation `fade-in` au mount + `hover-scale` léger sur le mockup

**Sections features / pricing / FAQ**
- Cards avec bordure or 1px très subtile, hover : élévation + glow doré
- Icônes Lucide en or sur fond émeraude pâle (cercle 48px)
- Section dividers : fines barres dorées au lieu de borders grises
- Pricing : carte "Premium" mise en avant avec gradient émeraude et badge or "Recommandé"

**Navigation / Footer**
- Nav sticky, fond crème blur, logo + lien actif souligné en or
- Footer fond vert nuit, texte ivoire, accents or

## App connectée

**Layout (`Layout.tsx` + `AppSidebar.tsx`)**
- Sidebar : fond vert nuit profond (`--sidebar-background` 158 50% 8%), texte ivoire, item actif fond émeraude + barre or 3px à gauche
- Logo en haut avec léger glow doré
- Header : fond crème, bordure basse 1px or 20% opacité, titre Fraunces

**Pages app (Dashboard, listes…)**
- Cards stats : bordure subtile, accent number en Fraunces, mini-tendance en or/émeraude
- Boutons primaires migrés vers variante `premium` automatiquement
- Badges : versions sémantiques (success émeraude, warning or, etc.) gardées mais teintes ajustées
- Tableaux : header fond crème, hover ligne émeraude 5%

**Pas touché**
- Logique métier, hooks, queries, edge functions
- Structure des routes
- Composants de formulaires (juste héritage des tokens)
- Composants PDF/email (rendus serveur, hors scope visuel app)

## Détails techniques

1. `bun add @fontsource/fraunces @fontsource-variable/inter-tight`
2. `src/main.tsx` : ajouter imports fonts
3. `tailwind.config.ts` : `fontFamily: { display: ['Fraunces', 'serif'], sans: ['"Inter Tight Variable"', 'system-ui'] }` + extension `boxShadow.elegant`, `boxShadow.gold`, `backgroundImage.gradient-hero`, `backgroundImage.gradient-gold`
4. `src/index.css` : remplacer les blocs `:root` et `.dark` par la nouvelle palette + nouveaux tokens gradient/shadow ; ajouter utilities `.text-gradient-gold`, `.bg-hero-radial`
5. `src/components/ui/button.tsx` : ajouter variantes `premium` et `gold`
6. Mises à jour ciblées :
   - `Index.tsx` : hero (eyebrow, titre Fraunces, CTA premium, halo), sections features/pricing (icônes or, cards bordure or)
   - `Software.tsx`, `PublicPricing.tsx`, `Comparison*.tsx`, `About.tsx`, `Contact.tsx` : remplacement classes typographiques (titres `font-display`), CTA en variante `premium`
   - `PublicNavigation.tsx`, `Footer.tsx` : couleurs et accents
   - `AppSidebar.tsx`, `Layout.tsx` : item actif émeraude+or, header typo
   - `Dashboard.tsx` : cards stats avec accent Fraunces + or

## Plan d'exécution

1. Fondations design system (CSS tokens, fonts, button variants, tailwind config)
2. Landing : hero Index + nav + footer
3. Landing : autres pages publiques (héritage tokens, ajustements ciblés)
4. App : sidebar + layout
5. App : dashboard (cards stats)
6. Vérification visuelle desktop + mobile sur quelques pages clés

## Hors scope

- Refonte structurelle des pages (sections, hiérarchie inchangées)
- Modifications fonctionnelles, données, permissions, RLS
- PDF, emails, edge functions
- Animations lourdes (framer-motion non requis à intensité 3)

Souhaites-tu que je lance l'implémentation ?
