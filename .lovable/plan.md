## Objectif

Affiner le template email facture pour cohérence linguistique, footer épuré, messages par défaut non redondants, et CTA Stripe conditionnel.

## Changements

### 1. `supabase/functions/send-invoice-email/emailTemplate.ts`

- **Badge en-tête déjà localisé** via `T[language][emailType].eyebrow` — vérifier qu'on passe bien `language = client.language` (et non hardcodé à `en`) depuis `index.ts`.
- **Dates** : `formatDate()` utilise déjà `toLocaleDateString` selon `lang`. Vérifier que le rendu côté client (carte) est OK ; aucune modif nécessaire ici sauf si on trouve un endroit qui passe une string brute.
- **Footer** : retirer le bloc `<div style="color:#fff...">${company.name}</div>`. Garder uniquement :
  - `addressParts` (adresse)
  - `contactParts` (email · téléphone)
  - Mention « Envoyé via GestionFlow · gestionflow.net » (toujours affichée, plus de `hideBranding` qui masque tout — ou conserver `hideBranding` qui masque uniquement la mention GestionFlow).
- **CTA Stripe conditionnel** : le `ctaBlock` est déjà conditionnel sur `paymentLinkUrl`. S'assurer dans `index.ts` qu'on ne génère le lien que si le client a Stripe activé (champ `accept_online_payments` ou équivalent sur le client / la facture). Si non activé → `paymentLinkUrl = null` → pas de bouton.

### 2. `supabase/functions/send-invoice-email/index.ts`

- Vérifier la valeur passée à `language` dans `renderInvoiceEmailHtml(...)` — doit refléter `client.language || 'fr'`.
- Encadrer la création du payment link Stripe par une vérification `client.accept_online_payments === true` (ou champ équivalent à confirmer). Si désactivé : ne pas appeler `create-invoice-payment-link`, passer `paymentLinkUrl = null`.

### 3. `src/lib/emailTranslations.ts` (templates par défaut FR/EN)

Réécrire les corps `newInvoice`, `overdue`, `paymentConfirmation` pour **ne plus répéter** ce que la carte affiche déjà (numéro, montant, date d'échéance, date d'émission). Ton plus chaleureux et bref.

**Exemple `newInvoice` FR** :
```
Bonjour {client_name},

Voici votre nouvelle facture. Vous trouverez tous les détails dans le récapitulatif ci-dessus, ainsi qu'une copie PDF en pièce jointe.

Pour toute question, n'hésitez pas à répondre directement à ce courriel.

Merci de votre confiance,
{company_name}
```

**Exemple `overdue` FR** :
```
Bonjour {client_name},

Un petit rappel amical : votre facture {invoice_number} est aujourd'hui en retard de {days_overdue} jour(s). Le récapitulatif ci-dessus reprend les informations clés.

Si le paiement a déjà été effectué, merci d'ignorer ce message.

Cordialement,
{company_name}
```

**Exemple `paymentConfirmation` FR** :
```
Bonjour {client_name},

Nous confirmons la bonne réception de votre paiement. Merci !

Cordialement,
{company_name}
```

Versions EN équivalentes, même esprit.

⚠️ Ces templates par défaut ne sont injectés en BDD que pour **nouveaux** utilisateurs ; pour les utilisateurs existants, les anciens textes restent en base. Décision à valider :

## Question à confirmer

Pour les **utilisateurs existants** dont les templates email en BDD reprennent encore les vieux textes redondants : faut-il
- (a) **migrer** automatiquement leurs templates vers les nouvelles versions épurées (écrase leurs personnalisations si jamais identiques aux anciens défauts), ou
- (b) **laisser tel quel** — seuls les nouveaux comptes / les utilisateurs qui réinitialisent leur template verront la nouvelle version ?

## Hors scope

- Pas de changement sur le PDF ni sur les autres edge functions.
- Pas d'éditeur visuel.
