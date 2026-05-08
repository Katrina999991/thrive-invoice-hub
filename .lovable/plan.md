## Objectif

Adapter le texte de la mise en demeure pour qu'il dise **« à compter de la réception »** au lieu d'une date butoir fixe **lorsque le mode d'envoi est postal** (courrier recommandé, certifié, LRAR, courrier standard, huissier). Pour les modes instantanés (courriel), on garde la date fixe actuelle.

C'est la pratique standard des avocats au Québec/France pour les envois postaux : elle protège juridiquement contre l'argument du débiteur qui aurait reçu la lettre après la date limite.

## Comportement attendu

Selon le mode d'envoi sélectionné dans l'éditeur de mise en demeure :

| Mode d'envoi | Phrasing dans le PDF / HTML / courriel |
|---|---|
| Courriel | *« …avant le **15 mai 2026** »* (date fixe — comportement actuel) |
| Courrier recommandé / certifié / LRAR / standard / messagerie / huissier | *« …dans un délai de **5 jours** à compter de la réception de la présente mise en demeure »* |

Le délai en jours utilisé est celui déjà saisi par l'utilisateur (`payment_term_days`, ex. 5, 10, 15, 30).

## Avertissement dans l'éditeur

Ajouter un petit message d'information (non-bloquant) dans l'éditeur quand l'utilisateur choisit un mode postal :

> *« Le PDF mentionnera "X jours à compter de la réception" plutôt qu'une date fixe, pour tenir compte du délai postal. »*

## Fichiers à modifier

### 1. `src/lib/formalNoticeHtml.ts`
- Ajouter une fonction utilitaire `getDeadlinePhrase(method, days, dueDate, lang)` qui retourne soit la phrase « à compter de la réception » soit la date fixe selon le mode.
- Remplacer le bloc actuel qui affiche `due_at` formaté par cette phrase contextuelle.

### 2. `src/lib/formalNoticePdf.ts`
- Même logique : utiliser `getDeadlinePhrase(...)` au lieu de la date butoir formatée.

### 3. `src/components/FormalNoticeEditorDialog.tsx`
- Ajouter un encart d'information (Alert/composant existant) sous le sélecteur de mode d'envoi qui apparaît uniquement quand `sendingMethod` est postal, expliquant le changement de phrasing.
- (Optionnel) Griser/désactiver le champ « Date limite (due_at) » avec un libellé « calculée à la réception » pour les modes postaux, car la valeur ne sera pas affichée comme date dans le document final.

### 4. Traductions
Ajouter les chaînes bilingues (FR/EN) :

- FR : *« dans un délai de {days} jours à compter de la réception de la présente mise en demeure »*
- EN : *« within {days} days from the receipt of this formal notice »*
- FR (avertissement éditeur) : *« Mode postal sélectionné : le document mentionnera "{days} jours à compter de la réception" au lieu d'une date fixe. »*
- EN : *« Postal delivery selected: the document will state "{days} days from receipt" instead of a fixed date. »*

## Détails techniques

- Modes considérés comme **postaux** (phrasing « à compter de la réception ») :
  `standard_mail`, `registered_mail`, `certified_mail`, `courier`, `bailiff`, `lrar`
- Modes considérés comme **instantanés** (date fixe) :
  `email`
- La langue (`fr`/`en`) est déjà détectée via `detectNoticeLanguage(...)` dans `formalNoticeConfig.ts` — réutiliser.
- Aucun changement BD : `payment_term_days` et `due_at` existent déjà.
- Aucun changement aux courriels transactionnels (le PDF joint reflètera déjà le bon phrasing).

## Hors scope

- Pas de calcul automatique d'un délai de transit ajouté à `due_at` (ce serait l'Option A — peut être fait dans une itération ultérieure si tu le souhaites).
- Pas de modification des mises en demeure déjà envoyées par courriel.
- Pas de changement aux relances de paiement régulières (uniquement les mises en demeure formelles).

## Vérification

1. Créer une mise en demeure avec mode = **Courrier recommandé**, délai = 5 jours → le PDF doit dire *« dans un délai de 5 jours à compter de la réception… »*.
2. Créer une mise en demeure avec mode = **Courriel**, délai = 5 jours → le PDF garde la date fixe actuelle.
3. Tester en FR et en EN.
4. Vérifier l'avertissement dans l'éditeur quand on bascule entre courriel et courrier recommandé.
