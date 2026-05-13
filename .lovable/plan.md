## Diagnostic actuel

- **Search Console** : 12 URLs soumises dans le sitemap, **0 indexée**, 10 erreurs signalées. Seule `/` reçoit du trafic (6 clics, 52 impressions / 90j, position moy. 4,3).
- **Cause racine** : SPA React sans rendu serveur — Google reçoit la même coquille HTML pour chaque route et considère les pages secondaires comme dupliquées (« Page en double sans canonique sélectionnée par l'utilisateur » ou « Explorée, actuellement non indexée »).
- **Mots-clés ciblables** (faciles, marché CA-FR) : « logiciel gestion entreprise » (140/mo, KDI 7), « facture en ligne gratuit » (140/mo, KDI 29), « logiciel gestion pme » (90/mo, KDI 20), « logiciel facturation gratuit » (50/mo, KDI 20).
- **Mot-clé US à fort potentiel** : « quickbooks alternative » (3 600/mo, KDI 35) — déjà ciblé par `/comparison/quickbooks` mais non indexé.

## Plan en 3 chantiers

### 1. Réparer l'indexation (priorité absolue)

**Problème technique** : chaque route partage le même `<title>`, `<meta description>` et `<link rel=canonical>` injectés par `useSEO` côté client. Googlebot exécute partiellement le JS mais voit d'abord la coquille `index.html` identique → pages classées comme doublons.

**Correctifs** :
- Installer `react-helmet-async` et envelopper `<App>` dans `<HelmetProvider>` (`src/main.tsx`).
- Retirer la balise `<link rel="canonical">` injectée par `useSEO` au profit d'un `<Helmet>` par page (sinon double canonical).
- Ajouter un composant `<SEO>` Helmet dédié dans chaque page publique : `Index`, `Software`, `Pricing`, `Comparison`, `ComparisonQuickBooks`, `ComparisonWave`, `ComparisonFreshBooks`, `About`, `Contact`, `Privacy`, `Terms`. Chacune avec : `<title>` unique, `description` unique, `canonical` propre, `og:url`, `og:title`.
- Vérifier que `/auth` reste autorisé (actuellement dans le sitemap mais peu utile à indexer — le retirer).
- Garder le JSON-LD `Organization` global dans `index.html`, et ajouter un `Product` ou `SoftwareApplication` JSON-LD via Helmet sur `/software` et `/pricing`.

### 2. Ajouter du contenu non-marque pour gagner du trafic

Réécrire le H1 + intro de chaque page publique pour cibler une requête réelle (volume confirmé Semrush) :

| Page | Mot-clé cible (CA-FR) | Volume / KDI |
|---|---|---|
| `/` | logiciel gestion entreprise | 140 / 7 |
| `/software` | logiciel gestion pme | 90 / 20 |
| `/pricing` | logiciel facturation gratuit | 50 / 20 |
| `/comparison/quickbooks` | quickbooks alternative (US) | 3 600 / 35 |
| `/comparison/wave` | wave alternative (US) | 70 / 10 |

Travail : H1 contient le mot-clé, premier paragraphe répète une variation, FAQ existante enrichie pour capter les requêtes question (« meilleur logiciel facture gratuit », etc.). Pas de bourrage — phrases naturelles.

### 3. Relancer Search Console

Une fois les correctifs déployés (publish requis) :
- Resoumettre `https://gestionflow.net/sitemap.xml` dans Search Console (script via le connecteur).
- Demander une indexation manuelle (`URL Inspection → Request Indexing`) pour les 5 pages prioritaires : `/`, `/software`, `/pricing`, `/comparison/quickbooks`, `/comparison/wave`.
- Mettre en place un suivi : revérifier dans 14 jours via `searchAnalytics` pour confirmer que le nombre d'URLs indexées passe de 0 à 5+.

## Détails techniques

```text
src/
├── main.tsx              + import HelmetProvider, wrap <App>
├── hooks/useSEO.tsx      ← supprimer la création du <link rel="canonical">
├── components/SEO.tsx    + nouveau composant Helmet réutilisable (props: title, description, canonical, ogImage?, jsonLd?)
└── pages/
    ├── Index.tsx         + <SEO ... /> (FR/EN selon useLanguage)
    ├── Software.tsx      + <SEO ... />
    ├── Pricing.tsx       + <SEO ... />
    ├── Comparison.tsx    + <SEO ... />
    ├── ComparisonQuickBooks.tsx
    ├── ComparisonWave.tsx
    ├── ComparisonFreshBooks.tsx
    ├── About.tsx
    ├── Contact.tsx
    ├── Privacy.tsx
    └── Terms.tsx
public/
└── sitemap.xml           ← retirer /auth
```

Étape 3 (Search Console) sera exécutée par moi via `curl` sur le connecteur Google après le republish.

## Hypothèses

- Vous publiez l'app après l'implémentation — sans republish, les changements de `<head>` ne seront pas vus par Googlebot.
- Vous acceptez l'ajout de la dépendance `react-helmet-async` (~3 KB gzip).
- L'objectif court terme est l'indexation et 50–200 visiteurs organiques/mois, pas un trafic massif (la difficulté faible le permet sur 2-3 mois).

## Hors scope

- Création d'un blog / contenu long-format (à envisager en phase 2 si l'indexation décolle).
- SSR/Next.js (changement d'architecture trop lourd, pas justifié à ce stade).
- Achats de backlinks ou link-building actif.
- Modification du dashboard ou de logique métier.