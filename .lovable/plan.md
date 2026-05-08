## Objectif

Ajouter un champ explicite **Entreprise destinataire** dans la mise en demeure, en plus du champ actuel **Destinataire** (« À l'intention de la direction / des administrateurs ») et de l'**Adresse**. Le nom de la compagnie destinataire apparaîtra clairement sur le PDF, dans l'aperçu et dans le HTML imprimable.

## Affichage cible (bloc destinataire du PDF)

```
[Entreprise destinataire]          ← nouveau (ex: ABC Construction inc.)
À l'intention de la direction      ← recipient existant
123 Rue Principale                 ← recipient_address existant
Montréal, QC H1A 1A1
```

## Changements

### 1. Base de données
- Migration : ajouter la colonne `recipient_company text` à `public.invoice_formal_notices`.
- Backfill optionnel : pour les anciens enregistrements, laisser `NULL` (le PDF retombera sur le comportement actuel).

### 2. Hook `src/hooks/useFormalNotices.ts`
- Ajouter `recipient_company` dans l'interface `FormalNotice` et `FormalNoticeInput`.

### 3. Éditeur `src/components/FormalNoticeEditorDialog.tsx`
- Nouveau state `recipientCompany`, pré-rempli avec `invoice.clients?.name`.
- Nouveau champ Input « Entreprise destinataire » / « Recipient company » placé **au-dessus** du champ Destinataire actuel.
- Inclure dans le snapshot d'unsaved changes, le `createNotice`/`updateNotice`, et le hydrate depuis `editingNotice`.
- Passer la valeur à `generateFormalNoticePdf` via un nouveau champ `recipientCompany`.

### 4. PDF `src/lib/formalNoticePdf.ts`
- Ajouter `recipientCompany?: string` à `FormalNoticePdfData`.
- Dans le bloc destinataire, afficher `recipientCompany` en **gras** sur la première ligne (si fourni), puis `recipientName`, puis `recipientAddress`.
- Inclure dans le nom de fichier seulement si pertinent (sinon laisser le comportement actuel).

### 5. HTML `src/lib/formalNoticeHtml.ts`
- Même logique : si `recipientCompany`, l'ajouter en première ligne `<strong>` du `.recipient`.

### 6. Aperçu dans le dialog
- Mettre à jour le bloc d'aperçu (preview) du dialog pour refléter la même structure.

## Notes

- Champ optionnel : si vide, le PDF reste identique à aujourd'hui.
- Bilingue : libellé `Entreprise destinataire` (FR) / `Recipient company` (EN) selon `language`.
- Aucun changement aux courriels d'envoi (le sujet/corps utilisent déjà les variables existantes).