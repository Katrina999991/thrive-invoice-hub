import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * Time tracking permission types
 */
export type TimeTrackingPermission =
  | "time_tracking:view_own"
  | "time_tracking:view_all"
  | "time_tracking:create_own"
  | "time_tracking:edit_own"
  | "time_tracking:edit_all"
  | "time_tracking:delete_own"
  | "time_tracking:delete_all"
  | "time_tracking:approve"
  | "time_tracking:export"
  | "time_tracking:mark_as_billed"
  | "time_tracking:link_to_invoice";

export interface TimeTrackingPermissions {
  // View permissions
  canViewOwn: boolean;
  canViewAll: boolean;
  
  // Create permissions
  canCreate: boolean;
  
  // Edit permissions
  canEditOwn: boolean;
  canEditAll: boolean;
  
  // Delete permissions
  canDeleteOwn: boolean;
  canDeleteAll: boolean;
  
  // Billing permissions
  canApprove: boolean;
  canExport: boolean;
  canMarkAsBilled: boolean;
  canLinkToInvoice: boolean;
  
  // Helper methods
  canEditEntry: (entryUserId: string, isBilled: boolean) => boolean;
  canDeleteEntry: (entryUserId: string, isBilled: boolean) => boolean;
}

/**
 * Hook to get time tracking permissions based on user's role permissions
 */
export function useTimeTrackingPermissions(
  hasPermission: (permission: string) => boolean
): TimeTrackingPermissions {
  const { user } = useAuth();
  const userId = user?.id;

  return useMemo(() => {
    const canViewOwn = hasPermission("time_tracking:view_own");
    const canViewAll = hasPermission("time_tracking:view_all");
    const canCreate = hasPermission("time_tracking:create_own");
    const canEditOwn = hasPermission("time_tracking:edit_own");
    const canEditAll = hasPermission("time_tracking:edit_all");
    const canDeleteOwn = hasPermission("time_tracking:delete_own");
    const canDeleteAll = hasPermission("time_tracking:delete_all");
    const canApprove = hasPermission("time_tracking:approve");
    const canExport = hasPermission("time_tracking:export");
    const canMarkAsBilled = hasPermission("time_tracking:mark_as_billed");
    const canLinkToInvoice = hasPermission("time_tracking:link_to_invoice");

    /**
     * Check if user can edit a specific entry
     * - If billed, only users with edit_all can edit
     * - Otherwise, check if it's their own entry (edit_own) or they have edit_all
     */
    const canEditEntry = (entryUserId: string, isBilled: boolean): boolean => {
      if (isBilled) {
        // Billed entries can only be edited by admins with full access
        return canEditAll;
      }
      
      if (canEditAll) return true;
      if (canEditOwn && userId && entryUserId === userId) return true;
      
      return false;
    };

    /**
     * Check if user can delete a specific entry
     * - If billed, only users with delete_all can delete
     * - Otherwise, check if it's their own entry (delete_own) or they have delete_all
     */
    const canDeleteEntry = (entryUserId: string, isBilled: boolean): boolean => {
      if (isBilled) {
        // Billed entries can only be deleted by admins with full access
        return canDeleteAll;
      }
      
      if (canDeleteAll) return true;
      if (canDeleteOwn && userId && entryUserId === userId) return true;
      
      return false;
    };

    return {
      canViewOwn,
      canViewAll,
      canCreate,
      canEditOwn,
      canEditAll,
      canDeleteOwn,
      canDeleteAll,
      canApprove,
      canExport,
      canMarkAsBilled,
      canLinkToInvoice,
      canEditEntry,
      canDeleteEntry,
    };
  }, [hasPermission, userId]);
}
