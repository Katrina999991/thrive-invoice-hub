## Problème

Le compteur "Dépenses" dans l'admin (`UsersTable`) affiche le nombre de lignes `expenses` où `user_id = <utilisateur>`, peu importe la compagnie. Pour `app@statis.ca`, cela inclut une dépense créée alors qu'il était membre de la compagnie "Christian Mailhot" — il ne la voit donc pas dans sa propre compagnie "Test inc." et croit que le compteur est faux.

## Solution proposée

Clarifier dans l'admin **à quelle compagnie** appartiennent les dépenses (et autres compteurs créés par l'utilisateur) en ajoutant le contexte manquant, sans changer la logique de comptage (qui reste "créé par cet utilisateur").

### Étapes

1. **Edge function `get-all-users`** — ajouter, par utilisateur, la liste des compagnies où il a créé des dépenses avec le compte par compagnie (ex: `expenses_by_company: [{ company_id, company_name, count }]`). Idem pour invoices/quotes/clients si pertinent (au minimum dépenses pour cette session).

2. **`UsersTable.tsx`** — sur le badge/cellule "Dépenses", ajouter un Tooltip qui affiche la répartition par compagnie quand `expenses_count > 0`, par exemple :
   - `Test inc. — 0`
   - `Christian Mailhot — 1`

3. (Optionnel) Ajouter un petit libellé "créées par l'utilisateur (toutes compagnies)" dans le tooltip pour éviter toute future confusion.

## Hors scope

- Ne pas modifier le calcul des stats globales ni la sémantique des compteurs.
- Ne pas changer l'écran Dépenses utilisateur.
