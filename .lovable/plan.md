## Problème

Dans la mise en demeure, après avoir saisi la date d'envoi, le numéro de suivi et coché « Preuve d'envoi », l'ajout d'un fichier de preuve **efface ces champs**.

## Cause

Dans `src/components/FormalNoticeEditorDialog.tsx`, le `useEffect` de chargement (lignes 468-496) qui hydrate les champs (`recipient`, `tracking_number`, `sent_at`, etc.) à partir de `latestNotice` a comme dépendances `[open, latestNotice]`.

Le téléversement d'un fichier appelle `fetchAttachments()` qui déclenche une nouvelle exécution du composant. Lors de ce re-render, la référence de `latestNotice` (recalculée à chaque render via `notices[0]`) peut changer, ce qui relance l'effet et **réécrit les champs locaux non encore sauvegardés** avec les valeurs (vides) de la BD.

De plus, `buildTrackingData()` (ligne 594) **n'inclut pas `sent_at`** : même si l'utilisateur cliquait sur « Enregistrer le suivi », la date d'envoi qu'il a saisie ne serait pas persistée et serait perdue au rechargement.

## Correctifs

### 1. Hydratation : ne charger qu'une seule fois par notice

Dans `src/components/FormalNoticeEditorDialog.tsx`, remplacer la dépendance `latestNotice` par `latestNotice?.id` afin de ne ré-hydrater le formulaire **que si on change de mise en demeure**, pas à chaque re-render parent (notamment après `fetchAttachments`).

- Ligne 496 : `}, [open, latestNotice]);` → `}, [open, latestNotice?.id]);`
- Ligne 505 (effet de snapshot) : même changement.

### 2. `buildTrackingData` doit inclure `sent_at`

Pour que la date d'envoi saisie soit réellement persistée par « Enregistrer le suivi » :

```ts
const buildTrackingData = (): FormalNoticeInput => ({
  sending_method: sendingMethod,
  proof_status: proofStatus,
  tracking_number: trackingNumber || undefined,
  delivered_date: deliveredDate || null,
  sent_at: sentDate ? new Date(sentDate).toISOString() : undefined, // ← ajout
  risk_level: docRisk,
  delivery_status: deliveryStatus,
  proof_of_sending: proofSending,
  proof_of_receipt: proofReceipt,
  tracking_notes: trackingNotes || undefined,
});
```

Idem dans `buildSaveData` (ligne 571) : ajouter `sent_at: sentDate ? new Date(sentDate).toISOString() : undefined` pour que « Enregistrer brouillon » conserve aussi la date d'envoi.

### 3. Vérification

Après les changements :
1. Ouvrir une mise en demeure existante.
2. Saisir date d'envoi + n° de suivi + cocher « Preuve d'envoi ».
3. Téléverser un fichier de preuve.
4. **Attendu** : les trois champs restent remplis ; le fichier apparaît dans la liste.
5. Cliquer « Enregistrer le suivi », fermer/rouvrir : tout est conservé, y compris la date d'envoi.

## Hors scope

- Aucun changement BD nécessaire (la colonne `sent_at` existe déjà dans `invoice_formal_notices`).
- Aucun changement au PDF, au HTML ni aux courriels.
