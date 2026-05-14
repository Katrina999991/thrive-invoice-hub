# Refonte du courriel d'envoi de facture

## Contexte

Actuellement, le courriel envoyé via `send-invoice-email` est un simple texte brut converti en HTML avec des `<br>`. Visuellement, il ressemble à un email d'utilitaire technique : pas d'en-tête, pas de logo, pas de carte récapitulative, bouton de paiement isolé en bas. Le PDF reste, lui, soigné.

## Objectif

Encapsuler le contenu existant (sujet, message personnalisable du client, lien de paiement, signature) dans un **template HTML professionnel** réutilisable pour les 3 types d'emails : nouvelle facture, relance, confirmation de paiement.

## Direction visuelle

- En-tête coloré avec **logo de l'entreprise** (fallback : nom de l'entreprise en typographie soignée)
- **Carte récapitulative** mise en évidence : numéro de facture, date d'émission, échéance, montant total (gros caractères)
- Corps : message du client (custom ou template par défaut) avec mise en forme propre
- **Bouton CTA "Payer maintenant"** intégré dans la carte (au lieu d'être ajouté en fin de message)
- Pied de page : coordonnées de l'entreprise (adresse, téléphone, email) + mention "Envoyé via GestionFlow" discrète
- Compatible clients de messagerie (tables inline, styles inline, largeur 600px max, fond neutre)
- Bilingue FR/EN selon `client.language`
- Variantes de couleur d'accent reprenant `invoiceColor` déjà sélectionné pour le PDF (cohérence visuelle facture/email)

## Changements techniques

1. **Nouveau fichier** `supabase/functions/send-invoice-email/emailTemplate.ts`
   - Fonction `renderInvoiceEmailHtml({ company, client, invoice, bodyMessageHtml, paymentLinkUrl, emailType, language, accentColor })` qui retourne le HTML complet de l'email
   - Table-based layout avec styles inline pour compatibilité Outlook/Gmail/Apple Mail
   - Mapping des `invoiceColor` existants (blue, green, etc.) vers des couleurs HEX d'accent

2. **Modification** `supabase/functions/send-invoice-email/index.ts`
   - Garder toute la logique existante (récupération facture, décryptage, sélection template, remplacement variables, création lien paiement)
   - À la place de concaténer le bouton de paiement dans `emailMessage`, conserver `paymentLinkUrl` séparément
   - Convertir le `emailMessage` (texte) en paragraphes HTML propres au lieu de simples `<br>`
   - Appeler `renderInvoiceEmailHtml(...)` pour produire le `html` final passé à `resend.emails.send`
   - Aucun changement aux paramètres d'entrée, aux templates stockés en BDD, ni au PDF

3. **Aucune migration DB** : les champs `invoice_email_message_*` existants restent utilisés tel quel comme corps du message à l'intérieur du nouveau template.

## Hors scope

- PDF de facture (déjà soigné)
- Emails d'auth, abonnement, contact (autres fonctions)
- Éditeur visuel pour personnaliser le template par l'utilisateur

## Question

Souhaites-tu que la couleur d'accent du courriel suive automatiquement la couleur du PDF (`invoiceColor`), ou préfères-tu une couleur de marque GestionFlow fixe (bleu) pour tous les emails ?
