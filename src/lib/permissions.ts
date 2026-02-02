/**
 * Centralized Permission System
 * Single source of truth for all permission keys and utilities
 */

// ============================================
// PERMISSION CONSTANTS - Use these everywhere
// ============================================

export const PERMISSIONS = {
  // Clients
  CLIENTS_VIEW: "clients:view",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_EDIT: "clients:edit",
  CLIENTS_DELETE: "clients:delete",

  // Companies
  COMPANIES_VIEW: "companies:view",
  COMPANIES_CREATE: "companies:create",
  COMPANIES_EDIT: "companies:edit",
  COMPANIES_DELETE: "companies:delete",

  // Invoices
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_EDIT: "invoices:edit",
  INVOICES_SEND: "invoices:send",
  INVOICES_DELETE: "invoices:delete",

  // Quotes
  QUOTES_VIEW: "quotes:view",
  QUOTES_CREATE: "quotes:create",
  QUOTES_EDIT: "quotes:edit",
  QUOTES_SEND: "quotes:send",
  QUOTES_DELETE: "quotes:delete",
  QUOTES_APPROVE: "quotes:approve",

  // Expenses - Base
  EXPENSES_VIEW: "expenses:view",
  EXPENSES_CREATE: "expenses:create",
  EXPENSES_EDIT: "expenses:edit",
  EXPENSES_DELETE: "expenses:delete",
  EXPENSES_APPROVE: "expenses:approve",
  // Expenses - Granular
  EXPENSES_VIEW_OWN: "expenses:view_own",
  EXPENSES_VIEW_ALL: "expenses:view_all",
  EXPENSES_EDIT_OWN: "expenses:edit_own",
  EXPENSES_EDIT_ALL: "expenses:edit_all",
  EXPENSES_DELETE_OWN: "expenses:delete_own",
  EXPENSES_DELETE_ALL: "expenses:delete_all",

  // Products
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT: "products:edit",
  PRODUCTS_DELETE: "products:delete",

  // Inventory
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_ADJUST: "inventory:adjust",
  INVENTORY_EDIT: "inventory:edit",

  // Time Tracking - Base
  TIME_TRACKING_VIEW: "time_tracking:view",
  TIME_TRACKING_CREATE: "time_tracking:create",
  TIME_TRACKING_EDIT: "time_tracking:edit",
  TIME_TRACKING_DELETE: "time_tracking:delete",
  // Time Tracking - Granular
  TIME_TRACKING_VIEW_OWN: "time_tracking:view_own",
  TIME_TRACKING_VIEW_ALL: "time_tracking:view_all",
  TIME_TRACKING_CREATE_OWN: "time_tracking:create_own",
  TIME_TRACKING_EDIT_OWN: "time_tracking:edit_own",
  TIME_TRACKING_EDIT_ALL: "time_tracking:edit_all",
  TIME_TRACKING_DELETE_OWN: "time_tracking:delete_own",
  TIME_TRACKING_DELETE_ALL: "time_tracking:delete_all",
  TIME_TRACKING_APPROVE: "time_tracking:approve",
  TIME_TRACKING_EXPORT: "time_tracking:export",
  TIME_TRACKING_MARK_AS_BILLED: "time_tracking:mark_as_billed",
  TIME_TRACKING_LINK_TO_INVOICE: "time_tracking:link_to_invoice",

  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",

  // Access Management
  ACCESS_VIEW_MEMBERS: "access:view_members",
  ACCESS_INVITE: "access:invite",
  ACCESS_REMOVE: "access:remove",
  ACCESS_MANAGE_ROLES: "access:manage_roles",

  // Billing
  BILLING_VIEW: "billing:view",
  BILLING_MANAGE: "billing:manage",

  // Debug
  DEBUG_PERMISSIONS_READ: "debug:permissions_read",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================
// PERMISSION RESOLUTION UTILITIES
// ============================================

/**
 * Hierarchical permission mapping
 * Maps base permissions to their granular variants
 */
const HIERARCHICAL_PERMISSIONS: Record<string, string[]> = {
  "expenses:view": ["expenses:view_own", "expenses:view_all"],
  "expenses:edit": ["expenses:edit_own", "expenses:edit_all"],
  "expenses:delete": ["expenses:delete_own", "expenses:delete_all"],
  "time_tracking:view": ["time_tracking:view_own", "time_tracking:view_all"],
  "time_tracking:create": ["time_tracking:create_own"],
  "time_tracking:edit": ["time_tracking:edit_own", "time_tracking:edit_all"],
  "time_tracking:delete": ["time_tracking:delete_own", "time_tracking:delete_all"],
};

/**
 * Check if a permission is satisfied by the user's permissions list
 * Handles hierarchical permission resolution
 */
export function checkPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Direct match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check if any hierarchical variant satisfies the permission
  const variants = HIERARCHICAL_PERMISSIONS[requiredPermission];
  if (variants) {
    return variants.some(variant => userPermissions.includes(variant));
  }

  return false;
}

/**
 * Deduplicate and normalize permissions list
 */
export function normalizePermissions(permissions: string[]): string[] {
  return [...new Set(permissions)].sort();
}

/**
 * Get all base permissions that are implicitly granted by granular permissions
 * E.g., if user has "expenses:view_own", they implicitly have "expenses:view"
 */
export function expandPermissions(permissions: string[]): string[] {
  const expanded = new Set(permissions);

  // Add base permissions for any granular permissions the user has
  Object.entries(HIERARCHICAL_PERMISSIONS).forEach(([base, variants]) => {
    if (variants.some(v => permissions.includes(v))) {
      expanded.add(base);
    }
  });

  return [...expanded].sort();
}

// ============================================
// PERMISSION GROUPINGS (for UI display)
// ============================================

export const PERMISSION_GROUPS = {
  clients: {
    labelFr: "Clients",
    labelEn: "Clients",
    permissions: [
      PERMISSIONS.CLIENTS_VIEW,
      PERMISSIONS.CLIENTS_CREATE,
      PERMISSIONS.CLIENTS_EDIT,
      PERMISSIONS.CLIENTS_DELETE,
    ],
  },
  companies: {
    labelFr: "Entreprises",
    labelEn: "Companies",
    permissions: [
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.COMPANIES_CREATE,
      PERMISSIONS.COMPANIES_EDIT,
      PERMISSIONS.COMPANIES_DELETE,
    ],
  },
  invoices: {
    labelFr: "Factures",
    labelEn: "Invoices",
    permissions: [
      PERMISSIONS.INVOICES_VIEW,
      PERMISSIONS.INVOICES_CREATE,
      PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.INVOICES_DELETE,
    ],
  },
  quotes: {
    labelFr: "Devis",
    labelEn: "Quotes",
    permissions: [
      PERMISSIONS.QUOTES_VIEW,
      PERMISSIONS.QUOTES_CREATE,
      PERMISSIONS.QUOTES_EDIT,
      PERMISSIONS.QUOTES_SEND,
      PERMISSIONS.QUOTES_DELETE,
      PERMISSIONS.QUOTES_APPROVE,
    ],
  },
  expenses: {
    labelFr: "Dépenses",
    labelEn: "Expenses",
    permissions: [
      PERMISSIONS.EXPENSES_VIEW,
      PERMISSIONS.EXPENSES_VIEW_OWN,
      PERMISSIONS.EXPENSES_VIEW_ALL,
      PERMISSIONS.EXPENSES_CREATE,
      PERMISSIONS.EXPENSES_EDIT,
      PERMISSIONS.EXPENSES_EDIT_OWN,
      PERMISSIONS.EXPENSES_EDIT_ALL,
      PERMISSIONS.EXPENSES_DELETE,
      PERMISSIONS.EXPENSES_DELETE_OWN,
      PERMISSIONS.EXPENSES_DELETE_ALL,
      PERMISSIONS.EXPENSES_APPROVE,
    ],
  },
  products: {
    labelFr: "Produits",
    labelEn: "Products",
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_EDIT,
      PERMISSIONS.PRODUCTS_DELETE,
    ],
  },
  inventory: {
    labelFr: "Inventaire",
    labelEn: "Inventory",
    permissions: [
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_EDIT,
    ],
  },
  timeTracking: {
    labelFr: "Suivi du temps",
    labelEn: "Time Tracking",
    permissions: [
      PERMISSIONS.TIME_TRACKING_VIEW,
      PERMISSIONS.TIME_TRACKING_VIEW_OWN,
      PERMISSIONS.TIME_TRACKING_VIEW_ALL,
      PERMISSIONS.TIME_TRACKING_CREATE,
      PERMISSIONS.TIME_TRACKING_CREATE_OWN,
      PERMISSIONS.TIME_TRACKING_EDIT,
      PERMISSIONS.TIME_TRACKING_EDIT_OWN,
      PERMISSIONS.TIME_TRACKING_EDIT_ALL,
      PERMISSIONS.TIME_TRACKING_DELETE,
      PERMISSIONS.TIME_TRACKING_DELETE_OWN,
      PERMISSIONS.TIME_TRACKING_DELETE_ALL,
      PERMISSIONS.TIME_TRACKING_APPROVE,
      PERMISSIONS.TIME_TRACKING_EXPORT,
      PERMISSIONS.TIME_TRACKING_MARK_AS_BILLED,
      PERMISSIONS.TIME_TRACKING_LINK_TO_INVOICE,
    ],
  },
  reports: {
    labelFr: "Rapports",
    labelEn: "Reports",
    permissions: [
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  settings: {
    labelFr: "Paramètres",
    labelEn: "Settings",
    permissions: [
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_EDIT,
    ],
  },
  access: {
    labelFr: "Gestion des accès",
    labelEn: "Access Management",
    permissions: [
      PERMISSIONS.ACCESS_VIEW_MEMBERS,
      PERMISSIONS.ACCESS_INVITE,
      PERMISSIONS.ACCESS_REMOVE,
      PERMISSIONS.ACCESS_MANAGE_ROLES,
    ],
  },
  billing: {
    labelFr: "Facturation",
    labelEn: "Billing",
    permissions: [
      PERMISSIONS.BILLING_VIEW,
      PERMISSIONS.BILLING_MANAGE,
    ],
  },
  debug: {
    labelFr: "Debug",
    labelEn: "Debug",
    permissions: [
      PERMISSIONS.DEBUG_PERMISSIONS_READ,
    ],
  },
} as const;

// ============================================
// ROLE DEFINITIONS (for reference)
// ============================================

export const SYSTEM_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  EMPLOYEE: "Employee",
  VIEWER: "Viewer",
} as const;

export type SystemRoleName = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];
