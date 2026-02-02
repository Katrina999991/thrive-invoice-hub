import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { PERMISSIONS } from "@/lib/permissions";

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
 * Uses centralized PERMISSIONS constants
 */
export function useTimeTrackingPermissions(
  hasPermission: (permission: string) => boolean
): TimeTrackingPermissions {
  const { user } = useAuth();
  const userId = user?.id;

  return useMemo(() => {
    const canViewOwn = hasPermission(PERMISSIONS.TIME_TRACKING_VIEW_OWN);
    const canViewAll = hasPermission(PERMISSIONS.TIME_TRACKING_VIEW_ALL);
    const canCreate = hasPermission(PERMISSIONS.TIME_TRACKING_CREATE_OWN);
    const canEditOwn = hasPermission(PERMISSIONS.TIME_TRACKING_EDIT_OWN);
    const canEditAll = hasPermission(PERMISSIONS.TIME_TRACKING_EDIT_ALL);
    const canDeleteOwn = hasPermission(PERMISSIONS.TIME_TRACKING_DELETE_OWN);
    const canDeleteAll = hasPermission(PERMISSIONS.TIME_TRACKING_DELETE_ALL);
    const canApprove = hasPermission(PERMISSIONS.TIME_TRACKING_APPROVE);
    const canExport = hasPermission(PERMISSIONS.TIME_TRACKING_EXPORT);
    const canMarkAsBilled = hasPermission(PERMISSIONS.TIME_TRACKING_MARK_AS_BILLED);
    const canLinkToInvoice = hasPermission(PERMISSIONS.TIME_TRACKING_LINK_TO_INVOICE);

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
