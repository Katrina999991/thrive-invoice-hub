## Problème 1 — Erreur RLS sur l'upload du logo

**Cause :** Les policies du bucket `company-logos` exigent que le chemin du fichier commence par l'ID de la compagnie : `{company_id}/filename.png` (vérifié via `storage.foldername(name)[1] = company_id`). Or le code uploade actuellement avec un simple `${Date.now()}.${ext}` à la racine → aucune correspondance avec `company_members`, donc RLS bloque.

**Correctifs dans `src/pages/Companies.tsx` (handleSubmit) :**

- **Mode édition** (`editingCompany` existe) : uploader vers `${editingCompany.id}/${Date.now()}.${ext}`.
- **Mode création** (pas encore d'ID) : 
  1. Créer la compagnie d'abord sans logo.
  2. Récupérer l'ID retourné par `createCompany`.
  3. Uploader vers `${newId}/${Date.now()}.${ext}`.
  4. Mettre à jour `logo_url` via `updateCompany(newId, { logo_url })`.
  
  → S'assurer que `createCompany` retourne bien la compagnie créée (vérifier le hook ; sinon adapter).

- Bonus : si l'upload échoue en mode édition après création, ne pas bloquer la sauvegarde des autres champs — on log l'erreur et on continue avec l'ancien `logo_url`. (À confirmer avec toi : préfères-tu bloquer la sauvegarde si le logo échoue ? Comportement actuel = bloque.)

## Problème 2 — Bouton bloqué sur "Uploading logo..."

**Causes identifiées dans `handleSubmit` et le Dialog :**

1. `validateInvoiceNumbering` early-return : reset `uploadingLogo` mais **pas** `isSubmitting`.
2. Erreur `createCompany` autre que `LIMIT_REACHED` : aucun reset des deux flags.
3. Fermeture du Dialog (Cancel ou clic extérieur) : `onOpenChange` ne réinitialise rien → l'état `uploadingLogo / isSubmitting` reste à `true` si un submit était en cours et reste affiché à la réouverture.

**Correctifs :**

- Reset `isSubmitting` partout où `uploadingLogo` est reset (validation, erreurs).
- Wrapper la fin de `handleSubmit` dans `try/finally` pour garantir le reset des deux flags quoi qu'il arrive.
- Sur `setIsDialogOpen(false)` (Cancel + onOpenChange) : appeler `resetForm()` qui doit aussi remettre `setUploadingLogo(false)` et `setIsSubmitting(false)`.

## Fichiers touchés

- `src/pages/Companies.tsx` — logique d'upload (chemin avec company_id, flux create-then-upload), gestion d'erreurs avec `try/finally`, reset complet dans `resetForm` et à la fermeture du Dialog.

Aucun changement DB ni edge function nécessaire — les policies RLS sont correctes, c'est le client qui n'envoyait pas le bon chemin.