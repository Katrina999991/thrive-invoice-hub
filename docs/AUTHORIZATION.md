# Système d'autorisation Plan + Permissions

## Vue d'ensemble

Le système d'autorisation de GestionFlow combine deux niveaux de contrôle d'accès:

1. **Plan d'abonnement** (niveau entreprise) - Détermine les fonctionnalités disponibles et les limites
2. **Permissions de rôle** (niveau membre) - Détermine ce que chaque membre peut faire

### Règle d'autorisation principale

Pour qu'une action soit autorisée, **les deux conditions** doivent être remplies:
- Le plan de l'entreprise doit inclure la fonctionnalité (ou être dans les limites)
- ET l'utilisateur doit avoir la permission requise via son rôle

## Utilisation

### Hook `useAuthorization`

```tsx
import { useAuthorization } from "@/hooks/useAuthorization";

function MyComponent() {
  const { 
    // Vérifications individuelles
    hasPermission,
    hasFeature,
    isLimitReached,
    
    // Autorisation combinée
    authorize,      // Async - pour validation serveur
    authorizeSync,  // Sync - pour UI (utilise cache)
    
    // Données
    planLimits,
    permissions,
    planType,
    canManageBilling,
    loading,
  } = useAuthorization(companyId);

  // Vérification de permission seulement
  if (!hasPermission("invoices:create")) {
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

  // Autorisation combinée (async pour actions)
  const handleCreate = async () => {
    const auth = await authorize("invoices:create", null, "invoices");
    if (!auth.allowed) {
      showError(auth.reason);
      return;
    }
    // Continuer avec l'action...
  };
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
      showMessage={true}  // Affiche message si bloqué
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

## Permissions disponibles

### Clients
- `clients:view`, `clients:create`, `clients:edit`, `clients:delete`

### Factures
- `invoices:view`, `invoices:create`, `invoices:edit`, `invoices:send`, `invoices:delete`

### Devis
- `quotes:view`, `quotes:create`, `quotes:edit`, `quotes:send`, `quotes:delete`

### Dépenses
- `expenses:view`, `expenses:create`, `expenses:edit`, `expenses:approve`, `expenses:delete`

### Produits
- `products:view`, `products:edit`

### Inventaire
- `inventory:view`, `inventory:adjust`

### Rapports
- `reports:view`, `reports:export`

### Paramètres
- `settings:view`, `settings:edit`

### Accès
- `access:view_members`, `access:invite`, `access:remove`, `access:manage_roles`

### Facturation
- `billing:manage`

## Messages d'erreur

Le système affiche des messages appropriés selon la raison du blocage:

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
