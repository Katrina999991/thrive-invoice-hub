# Plan de test des permissions par rôle - GestionFlow

## Vue d'ensemble

Ce document définit le plan de test pour valider que chaque rôle (Admin, Accountant, Employee, Viewer) respecte correctement les permissions assignées.

**Objectifs:**
- Vérifier que chaque rôle ne peut voir et effectuer que les actions autorisées
- Détecter les sur-permissions ou restrictions manquantes
- Confirmer l'enforcement côté serveur (pas seulement UI)

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Autorisé |
| ❌ | Bloqué |
| 🔒 | Propres entrées seulement |
| ⚠️ | À vérifier |

---

## Matrice des permissions par rôle

### Rôles système par défaut

| Permission | Owner | Admin | Accountant | Employee | Viewer |
|------------|-------|-------|------------|----------|--------|
| **Clients** |
| clients:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| clients:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| clients:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| clients:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Companies** |
| companies:view | ✅ | ✅ | ✅ | ✅ | ❌ |
| companies:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| companies:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| companies:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Invoices** |
| invoices:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| invoices:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| invoices:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| invoices:send | ✅ | ✅ | ❌ | ❌ | ❌ |
| invoices:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Quotes** |
| quotes:view | ✅ | ✅ | ✅ | ❌ | ✅ |
| quotes:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| quotes:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| quotes:send | ✅ | ✅ | ❌ | ❌ | ❌ |
| quotes:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Expenses** |
| expenses:view_own | ✅ | ✅ | ✅ | ✅ | ❌ |
| expenses:view_all | ✅ | ✅ | ✅ | ❌ | ✅ |
| expenses:create | ✅ | ✅ | ✅ | ✅ | ❌ |
| expenses:edit_own | ✅ | ✅ | ✅ | ✅ | ❌ |
| expenses:edit_all | ✅ | ✅ | ❌ | ❌ | ❌ |
| expenses:approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| expenses:delete_own | ✅ | ✅ | ✅ | ✅ | ❌ |
| expenses:delete_all | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Products** |
| products:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| products:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Inventory** |
| inventory:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory:adjust | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Time Tracking** |
| time_tracking:view_own | ✅ | ✅ | ✅ | ✅ | ❌ |
| time_tracking:view_all | ✅ | ✅ | ✅ | ❌ | ❌ |
| time_tracking:create_own | ✅ | ✅ | ❌ | ✅ | ❌ |
| time_tracking:edit_own | ✅ | ✅ | ❌ | ✅ | ❌ |
| time_tracking:edit_all | ✅ | ✅ | ❌ | ❌ | ❌ |
| time_tracking:delete_own | ✅ | ✅ | ❌ | ✅ | ❌ |
| time_tracking:delete_all | ✅ | ✅ | ❌ | ❌ | ❌ |
| time_tracking:approve | ✅ | ✅ | ❌ | ❌ | ❌ |
| time_tracking:export | ✅ | ✅ | ✅ | ❌ | ❌ |
| time_tracking:mark_as_billed | ✅ | ✅ | ❌ | ❌ | ❌ |
| time_tracking:link_to_invoice | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| reports:view | ✅ | ✅ | ✅ | ❌ | ✅ |
| reports:export | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings** |
| settings:view | ✅ | ✅ | ❌ | ❌ | ❌ |
| settings:edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Access** |
| access:view_members | ✅ | ✅ | ❌ | ❌ | ❌ |
| access:invite | ✅ | ✅ | ❌ | ❌ | ❌ |
| access:remove | ✅ | ✅ | ❌ | ❌ | ❌ |
| access:manage_roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Billing** |
| billing:manage | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Checklists de test par rôle

### 🔴 ADMIN

#### Sidebar Navigation
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Dashboard visible | ✅ | ⬜ | |
| Companies visible | ✅ | ⬜ | |
| Clients visible | ✅ | ⬜ | |
| Invoices visible | ✅ | ⬜ | |
| Quotes visible | ✅ | ⬜ | |
| Expenses visible | ✅ | ⬜ | |
| Products visible | ✅ | ⬜ | |
| Inventory visible | ✅ | ⬜ | |
| Time Tracking visible | ✅ | ⬜ | |
| Reports visible | ✅ | ⬜ | |
| Settings visible | ✅ | ⬜ | |
| Pricing visible | ✅ | ⬜ | |

#### Clients
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste clients | ✅ | ⬜ | |
| Bouton "Ajouter" visible | ✅ | ⬜ | |
| Créer un client | ✅ | ⬜ | Vérifier insertion DB |
| Modifier un client | ✅ | ⬜ | |
| Supprimer un client | ✅ | ⬜ | |

#### Companies
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste entreprises | ✅ | ⬜ | |
| Créer une entreprise | ✅ | ⬜ | |
| Modifier une entreprise | ✅ | ⬜ | |
| Supprimer entreprise (si pas Owner) | ❌ | ⬜ | Seul Owner peut supprimer |

#### Invoices
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les factures | ✅ | ⬜ | |
| Créer une facture | ✅ | ⬜ | |
| Modifier une facture | ✅ | ⬜ | |
| Changer le statut | ✅ | ⬜ | |
| Envoyer par email | ✅ | ⬜ | |
| Supprimer une facture | ✅ | ⬜ | |
| Archiver/Désarchiver | ✅ | ⬜ | |

#### Quotes
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir tous les devis | ✅ | ⬜ | |
| Créer un devis | ✅ | ⬜ | |
| Modifier un devis | ✅ | ⬜ | |
| Envoyer un devis | ✅ | ⬜ | |
| Convertir en facture | ✅ | ⬜ | |
| Supprimer un devis | ✅ | ⬜ | |

#### Expenses
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les dépenses | ✅ | ⬜ | |
| Filtre "Créateur" visible | ✅ | ⬜ | |
| Créer une dépense | ✅ | ⬜ | |
| Modifier ses propres dépenses | ✅ | ⬜ | |
| Modifier dépenses des autres | ✅ | ⬜ | |
| Approuver dépenses des autres | ✅ | ⬜ | |
| Désapprouver (X sur badge) | ✅ | ⬜ | |
| Supprimer ses propres dépenses | ✅ | ⬜ | |
| Supprimer dépenses des autres | ✅ | ⬜ | |
| Filtre "En attente" montre autres | ✅ | ⬜ | |

#### Products
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir tous les produits | ✅ | ⬜ | |
| Créer un produit | ✅ | ⬜ | |
| Modifier un produit | ✅ | ⬜ | |
| Supprimer un produit | ✅ | ⬜ | |

#### Inventory
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir inventaire | ✅ | ⬜ | |
| Ajuster stock | ✅ | ⬜ | |

#### Time Tracking
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les entrées | ✅ | ⬜ | |
| Filtre "Membre" visible | ✅ | ⬜ | |
| Créer une entrée | ✅ | ⬜ | |
| Modifier ses propres entrées | ✅ | ⬜ | |
| Modifier entrées des autres | ✅ | ⬜ | |
| Supprimer ses propres entrées | ✅ | ⬜ | |
| Supprimer entrées des autres | ✅ | ⬜ | |
| Approuver entrées des autres | ✅ | ⬜ | |
| Désapprouver (X sur badge) | ✅ | ⬜ | |
| Exporter | ✅ | ⬜ | |
| Marquer comme facturé | ✅ | ⬜ | |
| Lier à une facture | ✅ | ⬜ | |

#### Reports
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir rapports | ✅ | ⬜ | |
| Exporter PDF | ✅ | ⬜ | |
| Exporter Excel | ✅ | ⬜ | |
| Envoyer par email | ✅ | ⬜ | |

#### Settings
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Accéder aux paramètres | ✅ | ⬜ | |
| Onglet "Général" visible | ✅ | ⬜ | |
| Onglet "Équipe" visible | ✅ | ⬜ | |
| Modifier paramètres | ✅ | ⬜ | |
| Voir membres | ✅ | ⬜ | |
| Inviter un membre | ✅ | ⬜ | |
| Supprimer un membre | ✅ | ⬜ | |
| Modifier rôles | ✅ | ⬜ | |

#### Billing
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Page Pricing accessible | ✅ | ⬜ | |
| Changer de plan | ✅ | ⬜ | |

---

### 🟠 ACCOUNTANT

#### Sidebar Navigation
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Dashboard visible | ✅ | ⬜ | |
| Companies visible | ✅ | ⬜ | |
| Clients visible | ✅ | ⬜ | |
| Invoices visible | ✅ | ⬜ | |
| Quotes visible | ✅ | ⬜ | |
| Expenses visible | ✅ | ⬜ | |
| Products visible | ✅ | ⬜ | |
| Inventory visible | ✅ | ⬜ | |
| Time Tracking visible | ✅ | ⬜ | |
| Reports visible | ✅ | ⬜ | |
| Settings visible | ❌ | ⬜ | |
| Pricing visible | ❌ | ⬜ | |

#### Clients
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste clients | ✅ | ⬜ | |
| Bouton "Ajouter" masqué/désactivé | ✅ | ⬜ | |
| Modifier un client | ❌ | ⬜ | |
| Supprimer un client | ❌ | ⬜ | |

#### Companies
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste entreprises | ✅ | ⬜ | |
| Bouton "Ajouter" masqué | ✅ | ⬜ | |
| Modifier une entreprise | ❌ | ⬜ | |
| Supprimer une entreprise | ❌ | ⬜ | |

#### Invoices
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les factures | ✅ | ⬜ | |
| Bouton "Créer" masqué | ✅ | ⬜ | |
| Modifier une facture | ❌ | ⬜ | |
| Changer le statut | ❌ | ⬜ | Badge lecture seule |
| Envoyer par email | ❌ | ⬜ | |
| Supprimer une facture | ❌ | ⬜ | |

#### Quotes
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir tous les devis | ✅ | ⬜ | |
| Bouton "Créer" masqué | ✅ | ⬜ | |
| Modifier un devis | ❌ | ⬜ | |
| Envoyer un devis | ❌ | ⬜ | |
| Convertir en facture | ❌ | ⬜ | |

#### Expenses
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les dépenses | ✅ | ⬜ | view_all |
| Filtre "Créateur" visible | ✅ | ⬜ | |
| Créer une dépense | ✅ | ⬜ | |
| Modifier ses propres dépenses | ✅ | ⬜ | |
| Modifier dépenses des autres | ❌ | ⬜ | |
| Approuver dépenses des autres | ✅ | ⬜ | |
| Désapprouver (X sur badge) | ✅ | ⬜ | |
| Supprimer ses propres dépenses | ✅ | ⬜ | |
| Supprimer dépenses des autres | ❌ | ⬜ | |

#### Products
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir tous les produits | ✅ | ⬜ | |
| Modifier un produit | ❌ | ⬜ | |

#### Inventory
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir inventaire | ✅ | ⬜ | |
| Ajuster stock | ❌ | ⬜ | |

#### Time Tracking
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les entrées | ✅ | ⬜ | view_all |
| Filtre "Membre" visible | ✅ | ⬜ | |
| Créer une entrée | ❌ | ⬜ | |
| Modifier entrées | ❌ | ⬜ | |
| Supprimer entrées | ❌ | ⬜ | |
| Approuver entrées | ❌ | ⬜ | |
| Exporter | ✅ | ⬜ | |
| Marquer comme facturé | ❌ | ⬜ | |

#### Reports
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir rapports | ✅ | ⬜ | |
| Exporter PDF | ✅ | ⬜ | |
| Exporter Excel | ✅ | ⬜ | |

#### Settings & Billing
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Accéder aux paramètres | ❌ | ⬜ | Lien absent du sidebar |
| Accéder à /dashboard/settings directement | ❌ | ⬜ | Redirection ou message |
| Accéder à Pricing | ❌ | ⬜ | |

---

### 🟢 EMPLOYEE

#### Sidebar Navigation
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Dashboard visible | ✅ | ⬜ | |
| Companies visible | ✅ | ⬜ | |
| Clients visible | ✅ | ⬜ | |
| Invoices visible | ✅ | ⬜ | |
| Quotes visible | ❌ | ⬜ | |
| Expenses visible | ✅ | ⬜ | |
| Products visible | ✅ | ⬜ | |
| Inventory visible | ✅ | ⬜ | |
| Time Tracking visible | ✅ | ⬜ | |
| Reports visible | ❌ | ⬜ | |
| Settings visible | ❌ | ⬜ | |
| Pricing visible | ❌ | ⬜ | |

#### Clients
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste clients | ✅ | ⬜ | |
| Créer un client | ❌ | ⬜ | |
| Modifier un client | ❌ | ⬜ | |
| Supprimer un client | ❌ | ⬜ | |

#### Companies
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir liste entreprises | ✅ | ⬜ | |
| Créer/Modifier/Supprimer | ❌ | ⬜ | |

#### Invoices
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir toutes les factures | ✅ | ⬜ | |
| Changer le statut | ❌ | ⬜ | Badge lecture seule |
| Créer/Modifier/Supprimer | ❌ | ⬜ | |

#### Expenses (Propres entrées seulement)
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir ses propres dépenses | ✅ | ⬜ | |
| Voir dépenses des autres | ❌ | ⬜ | |
| Filtre "Créateur" invisible | ✅ | ⬜ | |
| Créer une dépense | ✅ | ⬜ | |
| Modifier ses propres dépenses | ✅ | ⬜ | |
| Supprimer ses propres dépenses | ✅ | ⬜ | |
| Approuver des dépenses | ❌ | ⬜ | |
| Bouton "En attente" dans filtre | ❌ | ⬜ | Ne devrait rien montrer |

#### Products
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir tous les produits | ✅ | ⬜ | |
| Modifier un produit | ❌ | ⬜ | |

#### Inventory
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir inventaire | ✅ | ⬜ | |
| Ajuster stock | ❌ | ⬜ | |

#### Time Tracking (Propres entrées seulement)
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Voir ses propres entrées | ✅ | ⬜ | |
| Voir entrées des autres | ❌ | ⬜ | |
| Filtre "Membre" invisible | ✅ | ⬜ | |
| Créer une entrée | ✅ | ⬜ | |
| Modifier ses propres entrées | ✅ | ⬜ | |
| Modifier entrées approuvées | ❌ | ⬜ | |
| Supprimer ses propres entrées | ✅ | ⬜ | |
| Approuver entrées | ❌ | ⬜ | |
| Exporter | ❌ | ⬜ | |
| Marquer comme facturé | ❌ | ⬜ | |

#### Reports, Settings, Billing
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Accéder aux rapports | ❌ | ⬜ | Lien absent |
| Accéder aux paramètres | ❌ | ⬜ | |
| Accéder à Pricing | ❌ | ⬜ | |

---

### 🔵 VIEWER

#### Sidebar Navigation
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Dashboard visible | ✅ | ⬜ | |
| Companies visible | ❌ | ⬜ | |
| Clients visible | ✅ | ⬜ | |
| Invoices visible | ✅ | ⬜ | |
| Quotes visible | ✅ | ⬜ | |
| Expenses visible | ✅ | ⬜ | |
| Products visible | ✅ | ⬜ | |
| Inventory visible | ✅ | ⬜ | |
| Time Tracking visible | ❌ | ⬜ | |
| Reports visible | ✅ | ⬜ | |
| Settings visible | ❌ | ⬜ | |
| Pricing visible | ❌ | ⬜ | |

#### Tous les modules (Lecture seule)
| Test | Attendu | Résultat | Notes |
|------|---------|----------|-------|
| Clients: voir | ✅ | ⬜ | |
| Clients: créer/modifier/supprimer | ❌ | ⬜ | |
| Invoices: voir | ✅ | ⬜ | |
| Invoices: créer/modifier/supprimer | ❌ | ⬜ | |
| Invoices: changer statut | ❌ | ⬜ | Badge lecture seule |
| Invoices: archiver/désarchiver | ❌ | ⬜ | |
| Quotes: voir | ✅ | ⬜ | |
| Quotes: créer/modifier/envoyer | ❌ | ⬜ | |
| Expenses: voir toutes | ✅ | ⬜ | view_all |
| Expenses: créer | ❌ | ⬜ | |
| Products: voir | ✅ | ⬜ | |
| Products: modifier | ❌ | ⬜ | |
| Inventory: voir | ✅ | ⬜ | |
| Inventory: ajuster | ❌ | ⬜ | |
| Reports: voir | ✅ | ⬜ | |
| Reports: exporter | ❌ | ⬜ | |

---

## Tests de sécurité serveur (RLS)

### Vérification que les actions bloquées échouent côté serveur

| Test | Méthode | Attendu |
|------|---------|---------|
| Employee tente INSERT sur client (via console) | `supabase.from('clients').insert(...)` | Erreur RLS |
| Viewer tente UPDATE sur invoice (via console) | `supabase.from('invoices').update(...)` | Erreur RLS |
| Accountant tente DELETE sur expense d'un autre | `supabase.from('expenses').delete()...` | Erreur RLS |
| Employee tente de voir dépenses des autres | `supabase.from('expenses').select()` | Retourne seulement ses propres |
| Viewer tente d'accéder à /dashboard/settings | Navigation directe | Redirection ou message |

---

## Rapport de test

### Résumé

| Rôle | Tests réussis | Tests échoués | Taux de réussite |
|------|---------------|---------------|------------------|
| Admin | ⬜/⬜ | ⬜ | ⬜% |
| Accountant | ⬜/⬜ | ⬜ | ⬜% |
| Employee | ⬜/⬜ | ⬜ | ⬜% |
| Viewer | ⬜/⬜ | ⬜ | ⬜% |

### Issues identifiées

| # | Rôle | Module | Description | Sévérité | Statut |
|---|------|--------|-------------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Notes de test

**Testeur:** ___________________  
**Date:** ___________________  
**Version:** ___________________  

---

## Procédure de test

### Préparation

1. Créer une entreprise de test
2. Créer 4 comptes utilisateurs de test
3. Assigner chaque compte à un rôle différent
4. Créer des données de test (clients, factures, dépenses, etc.)

### Exécution

1. Se connecter avec chaque compte
2. Parcourir tous les modules
3. Tester chaque action (voir, créer, modifier, supprimer)
4. Noter les résultats dans les checklists
5. Tester les violations RLS via console

### Validation

1. Comparer les résultats attendus vs obtenus
2. Documenter les écarts
3. Créer des tickets pour les corrections
4. Re-tester après corrections
