## Problème

Dans l'admin (`UsersTable`), le tooltip de la colonne "Dépenses" pour `app@statis.ca` affiche `Christian Mailhot — 1`. Or `app@statis.ca` n'a **aucun lien actuel** avec cette compagnie (vérifié en base : il n'est ni owner ni membre actif). La dépense date probablement d'une période de test où il avait été ajouté puis retiré.

Le tooltip est trompeur : il liste des compagnies où l'utilisateur **n'a plus accès**, comme si le lien existait encore.

## Solution

Filtrer la répartition par compagnie pour ne garder que les compagnies où l'utilisateur est **owner ou membre actif aujourd'hui**. Les dépenses créées ailleurs (anciens accès) sont regroupées sous une ligne unique « Autres / accès retiré ».

### Étapes

1. **Edge function `get-all-users/index.ts`**
   - Construire un set par utilisateur des `company_id` où il est *owner* (`companies.user_id = user.id`) **ou** membre actif (`company_members.user_id = user.id AND status = 'active'`). Une seule requête sur `company_members` (status active) suffit + le map `companies` déjà chargé.
   - Lors de la construction de `expenses_by_company`, séparer en deux groupes :
     - compagnies présentes dans le set des accès actuels → gardées telles quelles ;
     - autres → agrégées en une seule entrée `{ company_id: null, company_name: null, count: N, orphan: true }`.

2. **`src/components/admin/UsersTable.tsx`**
   - Mettre à jour le type `expenses_by_company` pour inclure le flag optionnel `orphan?: boolean`.
   - Dans le tooltip, afficher la ligne orpheline en dernier avec un libellé clair :
     - FR : « Autres compagnies (accès retiré) — N »
     - EN : « Other companies (access removed) — N »
   - Conserver le sous-titre existant « créées par l'utilisateur (toutes compagnies) ».

### Hors scope

- Ne pas modifier la valeur du compteur global `expenses_count` (reste « toutes les dépenses créées par cet utilisateur »).
- Ne pas toucher à la dépense existante en base.
- Ne pas modifier l'écran Dépenses utilisateur.

## Détails techniques

- Une nouvelle requête `supabaseClient.from('company_members').select('user_id, company_id').eq('status','active')` est ajoutée à côté des autres fetchs.
- Build d'un `Map<user_id, Set<company_id>>` combinant memberships actifs + ownership (via le tableau `companies` déjà chargé).
- Dans la boucle de construction par utilisateur :
  ```ts
  const accessible = accessibleCompaniesByUser.get(user.id) || new Set<string>();
  const inner = expensesByCompanyMap.get(user.id) || new Map();
  let orphanCount = 0;
  const visible: Array<{company_id, company_name, count, orphan?}> = [];
  for (const [cid, count] of inner) {
    if (cid !== "none" && accessible.has(cid)) {
      visible.push({ company_id: cid, company_name: companyNameMap.get(cid) || "—", count });
    } else {
      orphanCount += count;
    }
  }
  if (orphanCount > 0) visible.push({ company_id: null, company_name: null, count: orphanCount, orphan: true });
  ```
