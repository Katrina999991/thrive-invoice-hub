# Système d'autorisation Plan + Permissions

## Vue d'ensemble

Le système d'autorisation de GestionFlow combine deux niveaux de contrôle d'accès:

1. **Plan d'abonnement** (niveau entreprise) - Détermine les fonctionnalités disponibles et les limites
2. **Permissions de rôle** (niveau membre) - Détermine ce que chaque membre peut faire

### Règle d'autorisation principale

Pour qu'une action soit autorisée, **les deux conditions** doivent être remplies:
- Le plan de l'entreprise doit inclure la fonctionnalité (ou être dans les limites)
- ET l'utilisateur doit avoir la permission requise via son rôle

## Architecture centralisée

### Source unique de vérité

Le système utilise une architecture centralisée avec:

1. **`src/lib/permissions.ts`** - Constantes PERMISSIONS et utilitaires
2. **`src/hooks/usePermissions.ts`** - Hook central avec `can()` et `abilities`
3. **`src/hooks/useAuthorization.ts`** - Combine permissions + plan

### Constantes PERMISSIONS

```tsx
import { PERMISSIONS } from "@/lib/permissions";

// Utiliser les constantes plutôt que des strings
PERMISSIONS.EXPENSES_CREATE      // "expenses:create"
PERMISSIONS.TIME_TRACKING_VIEW_ALL   // "time_tracking:view_all"
PERMISSIONS.INVOICES_SEND        // "invoices:send"
```

## Utilisation

### Hook `usePermissions` (RECOMMANDÉ)

```tsx
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

function MyComponent({ companyId }) {
  const { 
    can,           // Vérification unique
    canAll,        // Toutes les permissions requises
    canAny,        // Au moins une permission
    abilities,     // Info sur le rôle (isOwner, isAdmin, etc.)
    loading,
    refetch,
    invalidatePermissions
  } = usePermissions(companyId);

  // Vérification simple
  if (!can(PERMISSIONS.EXPENSES_CREATE)) {
    return <p>Accès refusé</p>;
  }

  // Vérification multiple (toutes requises)
  if (!canAll([PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_SEND])) {
    return <p>Permissions insuffisantes</p>;
  }

  // Vérification rôle
  if (abilities.isOwner || abilities.isAdmin) {
    // Actions admin seulement
  }
}
```

### Hook `useAuthorization` (Plan + Permissions)

```tsx
import { useAuthorization } from "@/hooks/useAuthorization";

function MyComponent() {
  const { 
    can,            // Délègue à usePermissions
    hasFeature,     // Vérifie fonctionnalité du plan
    isLimitReached, // Vérifie limites du plan
    authorize,      // Async - validation serveur
    authorizeSync,  // Sync - pour UI
    abilities,      // Info rôle
    canManageBilling,
    loading,
  } = useAuthorization(companyId);

  // Vérification de permission
  if (!can("invoices:create")) {
    return <p>Accès refusé</p>;
  }

  // Vérification de fonctionnalité du plan
  if (!hasFeature("pdf_export")) {
    return <UpgradePrompt />;
  }

  // Autorisation combinée (sync pour UI)
  const result = authorizeSync("invoices:create", "pdf_export", "invoices");
  if (!result.allowed) {
    // result.reason: "missing_permission" | "feature_not_in_plan" | "limit_reached"
    return <AuthorizationMessage result={result} />;
  }
}
```

### Hook `useSelectedCompany`

```tsx
import { useSelectedCompany } from "@/hooks/useSelectedCompany";

function MyPage() {
  const { 
    selectedCompanyId,
    setSelectedCompanyId,
    can,              // Délègue à usePermissions
    canCreate,        // Raccourci: can(`${module}:create`)
    canEdit,          // Raccourci: can(`${module}:edit`)
    canDelete,        // Raccourci: can(`${module}:delete`)
    isOwner,
    isAdmin,
    invalidatePermissions,
    loading,
  } = useSelectedCompany();

  if (canCreate("expenses")) {
    // Afficher bouton création
  }
}
```

### Composant `AuthorizationGate`

```tsx
import { AuthorizationGate } from "@/components/AuthorizationGate";

function MyPage() {
  return (
    <AuthorizationGate
      companyId={selectedCompanyId}
      permission="reports:export"
      featureKey="all_reports"
      showMessage={true}
    >
      <ReportsExportButton />
    </AuthorizationGate>
  );
}
```

### Composant `AuthorizedButton`

```tsx
import { AuthorizedButton } from "@/components/AuthorizedButton";

function MyPage() {
  return (
    <AuthorizedButton
      companyId={selectedCompanyId}
      permission="invoices:create"
      checkLimit="invoices"
      onClick={handleCreateInvoice}
    >
      Créer une facture
    </AuthorizedButton>
  );
}
```

### Panneau de Debug (Admin/Owner)

```tsx
import { PermissionDebugPanel } from "@/components/PermissionDebugPanel";

function SettingsPage() {
  return (
    <PermissionDebugPanel 
      companyId={selectedCompanyId}
      companyName="Ma Compagnie"
    />
  );
}
```

Le panneau affiche:
- ID de la compagnie active
- Rôle détecté
- Liste des permissions
- Outil de test de permission

## Gestion du cache

```tsx
const { invalidatePermissions, refetch } = usePermissions(companyId);

// Après modification des rôles/permissions
await invalidatePermissions();

// Ou forcer un refetch immédiat
await refetch();
```

## Résolution hiérarchique

Les permissions de base sont automatiquement satisfaites par leurs variantes:

| Permission demandée | Satisfaite par |
|---------------------|----------------|
| `expenses:view` | `expenses:view_own` OU `expenses:view_all` |
| `expenses:edit` | `expenses:edit_own` OU `expenses:edit_all` |
| `time_tracking:view` | `time_tracking:view_own` OU `time_tracking:view_all` |

## Fonctionnalités du plan (`FeatureKey`)

- `pdf_export` - Export PDF
- `all_invoice_templates` - Tous les modèles de facture
- `custom_email_templates` - Modèles d'email personnalisés
- `all_reports` - Tous les rapports
- `category_management` - Gestion des catégories
- `quotes_enabled` - Fonctionnalité devis

## Types de limites (`LimitType`)

- `invoices` - Nombre de factures par mois
- `expenses` - Nombre de dépenses par mois
- `clients` - Nombre de clients

## Messages d'erreur

| Raison | Message pour le membre | Action possible |
|--------|------------------------|-----------------|
| `missing_permission` | "Vous n'avez pas accès à cette action" | Contacter l'admin |
| `feature_not_in_plan` | "Cette fonctionnalité n'est pas incluse dans votre plan" | Upgrade (si admin) |
| `limit_reached` | "Limite atteinte (X/Y)" | Upgrade (si admin) |
| `member_not_active` | "Votre accès a été suspendu" | Contacter l'admin |

## Base de données

### Table `company_subscriptions`

L'abonnement est attaché à l'entreprise, pas à l'utilisateur individuel:

```sql
CREATE TABLE company_subscriptions (
    company_id UUID PRIMARY KEY,
    plan_type subscription_plan,
    billing_cycle billing_cycle,
    invoices_this_month INT,
    expenses_this_month INT,
    ...
);
```

### Fonction `authorize_action`

Fonction SQL qui effectue la vérification complète côté serveur:

```sql
SELECT authorize_action(
    _company_id := 'uuid...',
    _user_id := 'uuid...',
    _permission := 'invoices:create',
    _feature_key := 'pdf_export',
    _check_limit := 'invoices'
);
-- Retourne: { "allowed": true/false, "reason": "..." }
```
