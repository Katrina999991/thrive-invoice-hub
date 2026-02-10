import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import type { CompanyRole } from "./useCompanyMembers";

export interface RolePermission {
  role_id: string;
  permission: string;
}

// All available permissions
export const ALL_PERMISSIONS = [
  // Clients
  { key: "clients:view", module: "clients", action: "view" },
  { key: "clients:create", module: "clients", action: "create" },
  { key: "clients:edit", module: "clients", action: "edit" },
  { key: "clients:delete", module: "clients", action: "delete" },
  // Companies
  { key: "companies:view", module: "companies", action: "view" },
  { key: "companies:create", module: "companies", action: "create" },
  { key: "companies:edit", module: "companies", action: "edit" },
  { key: "companies:delete", module: "companies", action: "delete" },
  // Invoices
  { key: "invoices:view", module: "invoices", action: "view" },
  { key: "invoices:create", module: "invoices", action: "create" },
  { key: "invoices:edit", module: "invoices", action: "edit" },
  { key: "invoices:send", module: "invoices", action: "send" },
  { key: "invoices:delete", module: "invoices", action: "delete" },
  // Quotes
  { key: "quotes:view", module: "quotes", action: "view" },
  { key: "quotes:create", module: "quotes", action: "create" },
  { key: "quotes:edit", module: "quotes", action: "edit" },
  { key: "quotes:send", module: "quotes", action: "send" },
  { key: "quotes:delete", module: "quotes", action: "delete" },
  { key: "quotes:approve", module: "quotes", action: "approve" },
  // Expenses (granular permissions)
  { key: "expenses:view_own", module: "expenses", action: "view_own" },
  { key: "expenses:create_own", module: "expenses", action: "create_own" },
  { key: "expenses:view_all", module: "expenses", action: "view_all" },
  
  { key: "expenses:edit_own", module: "expenses", action: "edit_own" },
  { key: "expenses:edit_all", module: "expenses", action: "edit_all" },
  { key: "expenses:approve", module: "expenses", action: "approve" },
  { key: "expenses:delete_own", module: "expenses", action: "delete_own" },
  { key: "expenses:delete_all", module: "expenses", action: "delete_all" },
  // Products
  { key: "products:view", module: "products", action: "view" },
  { key: "products:create", module: "products", action: "create" },
  { key: "products:edit", module: "products", action: "edit" },
  { key: "products:delete", module: "products", action: "delete" },
  // Inventory
  { key: "inventory:view", module: "inventory", action: "view" },
  { key: "inventory:adjust", module: "inventory", action: "adjust" },
  // Time Tracking (granular permissions)
  
  { key: "time_tracking:view_own", module: "time_tracking", action: "view_own" },
  { key: "time_tracking:view_all", module: "time_tracking", action: "view_all" },
  { key: "time_tracking:create_own", module: "time_tracking", action: "create_own" },
  { key: "time_tracking:edit_own", module: "time_tracking", action: "edit_own" },
  { key: "time_tracking:edit_all", module: "time_tracking", action: "edit_all" },
  { key: "time_tracking:delete_own", module: "time_tracking", action: "delete_own" },
  { key: "time_tracking:delete_all", module: "time_tracking", action: "delete_all" },
  { key: "time_tracking:approve", module: "time_tracking", action: "approve" },
  
  { key: "time_tracking:mark_as_billed", module: "time_tracking", action: "mark_as_billed" },
  { key: "time_tracking:link_to_invoice", module: "time_tracking", action: "link_to_invoice" },
  { key: "time_tracking:view_archived", module: "time_tracking", action: "view_archived" },
  { key: "time_tracking:archive", module: "time_tracking", action: "archive" },
  // Reports
  { key: "reports:view", module: "reports", action: "view" },
  { key: "reports:export", module: "reports", action: "export" },
  // Settings
  { key: "settings:view", module: "settings", action: "view" },
  { key: "settings:edit", module: "settings", action: "edit" },
  // Access
  { key: "access:view_members", module: "access", action: "view_members" },
  { key: "access:invite", module: "access", action: "invite" },
  { key: "access:remove", module: "access", action: "remove" },
  { key: "access:manage_roles", module: "access", action: "manage_roles" },
  // Billing
  { key: "billing:view", module: "billing", action: "view" },
  { key: "billing:manage", module: "billing", action: "manage" },
  // Debug
  { key: "debug:permissions_read", module: "debug", action: "permissions_read" },
];

export const PERMISSION_MODULES = [
  "clients",
  "companies",
  "invoices", 
  "quotes",
  "expenses",
  "products",
  "inventory",
  "time_tracking",
  "reports",
  "settings",
  "access",
  "billing",
  "debug"
];

export function useCompanyRoles(companyId: string | null) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Use RPC function to fetch permissions (bypasses RLS)
  const fetchRolePermissions = useCallback(async (roleId: string) => {
    if (!roleId) return [];

    try {
      const { data, error } = await supabase.rpc("get_role_permissions", {
        _role_id: roleId
      });

      if (error) throw error;

      // RPC returns array of {permission: string} objects
      const rawData = data as { permission: string }[] | null;
      const permissions = (rawData || []).map(p => p.permission);
      setRolePermissions(prev => ({ ...prev, [roleId]: permissions }));
      return permissions;
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }
  }, []);

  // Use RPC function to create role (bypasses RLS)
  const createRole = async (name: string, description?: string): Promise<CompanyRole | null> => {
    if (!companyId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_company_role", {
        _company_id: companyId,
        _name: name,
        _description: description || null
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Rôle créé" : "Role created",
        description: language === "fr" 
          ? `Le rôle "${name}" a été créé avec succès.`
          : `Role "${name}" has been created successfully.`
      });

      // The RPC returns the role data as JSON - parse it properly
      const roleData = typeof data === 'string' ? JSON.parse(data) : data;
      return roleData as CompanyRole;
    } catch (error: any) {
      console.error("Error creating role:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Use RPC function to update role (bypasses RLS)
  const updateRole = async (roleId: string, name: string, description?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("update_company_role", {
        _role_id: roleId,
        _name: name,
        _description: description || null
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Rôle mis à jour" : "Role updated",
        description: language === "fr" 
          ? "Le rôle a été mis à jour avec succès."
          : "Role has been updated successfully."
      });
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Use RPC function to delete role (bypasses RLS)
  const deleteRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("delete_company_role", {
        _role_id: roleId
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Rôle supprimé" : "Role deleted",
        description: language === "fr" 
          ? "Le rôle a été supprimé avec succès."
          : "Role has been deleted successfully."
      });
    } catch (error: any) {
      console.error("Error deleting role:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Use RPC function to set permissions (bypasses RLS)
  const setPermissions = async (roleId: string, permissions: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("set_role_permissions", {
        _role_id: roleId,
        _permissions: permissions
      });

      if (error) throw error;

      setRolePermissions(prev => ({ ...prev, [roleId]: permissions }));

      toast({
        title: language === "fr" ? "Permissions mises à jour" : "Permissions updated",
        description: language === "fr" 
          ? "Les permissions ont été mises à jour avec succès."
          : "Permissions have been updated successfully."
      });
    } catch (error: any) {
      console.error("Error setting permissions:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const duplicateRole = async (roleId: string, newName: string): Promise<CompanyRole | null> => {
    if (!companyId) return null;

    setLoading(true);
    try {
      // Get existing permissions
      const permissions = await fetchRolePermissions(roleId);

      // Create new role
      const newRole = await createRole(newName);
      if (!newRole) return null;

      // Copy permissions to new role
      if (permissions.length > 0) {
        await setPermissions(newRole.id, permissions);
      }

      return newRole;
    } catch (error: any) {
      console.error("Error duplicating role:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    rolePermissions,
    loading,
    fetchRolePermissions,
    createRole,
    updateRole,
    deleteRole,
    setPermissions,
    duplicateRole
  };
}
