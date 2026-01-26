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
  // Expenses
  { key: "expenses:view", module: "expenses", action: "view" },
  { key: "expenses:create", module: "expenses", action: "create" },
  { key: "expenses:edit", module: "expenses", action: "edit" },
  { key: "expenses:approve", module: "expenses", action: "approve" },
  { key: "expenses:delete", module: "expenses", action: "delete" },
  // Products
  { key: "products:view", module: "products", action: "view" },
  { key: "products:edit", module: "products", action: "edit" },
  // Inventory
  { key: "inventory:view", module: "inventory", action: "view" },
  { key: "inventory:adjust", module: "inventory", action: "adjust" },
  // Time Tracking
  { key: "time_tracking:view", module: "time_tracking", action: "view" },
  { key: "time_tracking:create", module: "time_tracking", action: "create" },
  { key: "time_tracking:edit", module: "time_tracking", action: "edit" },
  { key: "time_tracking:delete", module: "time_tracking", action: "delete" },
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
  { key: "billing:manage", module: "billing", action: "manage" },
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
  "billing"
];

export function useCompanyRoles(companyId: string | null) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchRolePermissions = useCallback(async (roleId: string) => {
    if (!roleId) return [];

    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission")
        .eq("role_id", roleId);

      if (error) throw error;

      const permissions = (data || []).map(p => p.permission);
      setRolePermissions(prev => ({ ...prev, [roleId]: permissions }));
      return permissions;
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }
  }, []);

  const createRole = async (name: string, description?: string): Promise<CompanyRole | null> => {
    if (!companyId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_roles")
        .insert({
          company_id: companyId,
          name,
          description: description || null,
          is_system: false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === "fr" ? "Rôle créé" : "Role created",
        description: language === "fr" 
          ? `Le rôle "${name}" a été créé avec succès.`
          : `Role "${name}" has been created successfully.`
      });

      return data;
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

  const updateRole = async (roleId: string, name: string, description?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("company_roles")
        .update({ name, description: description || null })
        .eq("id", roleId);

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

  const deleteRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("company_roles")
        .delete()
        .eq("id", roleId);

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

  const setPermissions = async (roleId: string, permissions: string[]) => {
    setLoading(true);
    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissions.length > 0) {
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(permissions.map(p => ({ role_id: roleId, permission: p })));

        if (insertError) throw insertError;
      }

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
