import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";
import { subDays } from "date-fns";

export type AuditEventCategory = 
  | 'authentication'
  | 'billing'
  | 'sales'
  | 'products'
  | 'exports'
  | 'settings';

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  company_id: string | null;
  category: AuditEventCategory;
  event_type: string;
  description: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  platform: string;
}

interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  category?: AuditEventCategory;
  searchQuery?: string;
}

// Event type translations
export const eventTypeTranslations: Record<string, { fr: string; en: string }> = {
  // Authentication
  'login_success': { fr: 'Connexion réussie', en: 'Successful login' },
  'login_failed': { fr: 'Échec de connexion', en: 'Failed login' },
  'mfa_enabled': { fr: 'MFA activé', en: 'MFA enabled' },
  'mfa_disabled': { fr: 'MFA désactivé', en: 'MFA disabled' },
  'mfa_recovery_used': { fr: 'Code de récupération MFA utilisé', en: 'MFA recovery code used' },
  'recovery_code_used': { fr: 'Code de récupération MFA utilisé', en: 'MFA recovery code used' },
  'password_changed': { fr: 'Mot de passe modifié', en: 'Password changed' },
  'email_changed': { fr: 'Adresse courriel modifiée', en: 'Email changed' },
  
  // Billing
  'plan_changed': { fr: 'Plan modifié', en: 'Plan changed' },
  'plan_upgraded': { fr: 'Mise à niveau', en: 'Plan upgraded' },
  'plan_downgraded': { fr: 'Rétrogradation', en: 'Plan downgraded' },
  'subscription_upgraded': { fr: 'Mise à niveau effectuée', en: 'Subscription upgraded' },
  'subscription_cancelled': { fr: 'Abonnement annulé', en: 'Subscription cancelled' },
  'payment_method_updated': { fr: 'Mode de paiement mis à jour', en: 'Payment method updated' },
  'checkout_initiated': { fr: 'Paiement initié', en: 'Checkout initiated' },
  'upgrade_scheduled': { fr: 'Mise à niveau planifiée', en: 'Upgrade scheduled' },
  'customer_portal_opened': { fr: 'Portail client ouvert', en: 'Customer portal opened' },
  
  // Sales
  'invoice_created': { fr: 'Facture créée', en: 'Invoice created' },
  'invoice_updated': { fr: 'Facture modifiée', en: 'Invoice updated' },
  'invoice_deleted': { fr: 'Facture supprimée', en: 'Invoice deleted' },
  'invoice_marked_paid': { fr: 'Facture marquée payée', en: 'Invoice marked as paid' },
  'expense_created': { fr: 'Dépense créée', en: 'Expense created' },
  'expense_updated': { fr: 'Dépense modifiée', en: 'Expense updated' },
  'expense_deleted': { fr: 'Dépense supprimée', en: 'Expense deleted' },
  
  // Products
  'product_created': { fr: 'Produit créé', en: 'Product created' },
  'product_updated': { fr: 'Produit modifié', en: 'Product updated' },
  'product_deleted': { fr: 'Produit supprimé', en: 'Product deleted' },
  'stock_adjusted': { fr: 'Stock ajusté', en: 'Stock adjusted' },
  'stock_expense_created': { fr: 'Dépense stock créée automatiquement', en: 'Stock expense auto-created' },
  
  // Exports
  'pdf_downloaded': { fr: 'PDF téléchargé', en: 'PDF downloaded' },
  'excel_exported': { fr: 'Export Excel', en: 'Excel exported' },
  'report_emailed': { fr: 'Rapport envoyé par courriel', en: 'Report emailed' },
  
  // Settings
  'taxes_updated': { fr: 'Taxes modifiées', en: 'Taxes updated' },
  'document_templates_updated': { fr: 'Modèles de documents modifiés', en: 'Document templates updated' },
  'email_templates_updated': { fr: 'Modèles de courriel modifiés', en: 'Email templates updated' },
  'email_settings_updated': { fr: 'Réglages email modifiés', en: 'Email settings updated' },
  'branding_updated': { fr: 'Apparence PDF modifiée', en: 'PDF branding updated' },
  'invoice_numbering_updated': { fr: 'Numérotation des factures modifiée', en: 'Invoice numbering updated' },
};

export const categoryTranslations: Record<AuditEventCategory, { fr: string; en: string }> = {
  'authentication': { fr: 'Sécurité', en: 'Security' },
  'billing': { fr: 'Facturation', en: 'Billing' },
  'sales': { fr: 'Ventes & Finances', en: 'Sales & Finances' },
  'products': { fr: 'Produits & Stocks', en: 'Products & Inventory' },
  'exports': { fr: 'Exports & Documents', en: 'Exports & Documents' },
  'settings': { fr: 'Réglages', en: 'Settings' },
};

export const useAuditLogs = (filters?: AuditLogFilters) => {
  const { user, username } = useAuth();
  const { planLimits } = useSubscription();
  const queryClient = useQueryClient();

  // Determine history limit based on plan
  const getHistoryLimit = () => {
    if (!planLimits) return 0;
    switch (planLimits.plan_type) {
      case 'free':
        return 0; // No access
      case 'premium':
        return 30; // 30 days
      case 'pro':
        return null; // Unlimited
      default:
        return 0;
    }
  };

  const historyDays = getHistoryLimit();
  const hasAccess = historyDays !== 0;

  // Fetch audit logs
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ["auditLogs", user?.id, filters, historyDays],
    queryFn: async () => {
      if (!user?.id || !hasAccess) return [];

      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      // Apply date filter based on plan
      if (historyDays !== null) {
        const minDate = subDays(new Date(), historyDays).toISOString();
        query = query.gte("created_at", minDate);
      }

      // Apply custom date filters
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      // Apply category filter
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Client-side search filter
      let results = (data || []) as AuditLog[];
      if (filters?.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        results = results.filter(log => 
          log.description.toLowerCase().includes(searchLower) ||
          log.event_type.toLowerCase().includes(searchLower) ||
          log.user_name?.toLowerCase().includes(searchLower)
        );
      }
      
      return results;
    },
    enabled: !!user?.id && hasAccess,
  });

  // Log an audit event (async, never blocks)
  const logEvent = async (
    category: AuditEventCategory,
    eventType: string,
    description: string,
    options?: {
      companyId?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!user?.id) return;

    try {
      // Fire and forget - don't await
      supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_user_name: username || user.email?.split('@')[0] || 'Unknown',
        p_company_id: options?.companyId || null,
        p_category: category,
        p_event_type: eventType,
        p_description: description,
        p_related_entity_type: options?.relatedEntityType || null,
        p_related_entity_id: options?.relatedEntityId || null,
        p_metadata: options?.metadata || {},
        p_ip_address: null, // Could be obtained via API
        p_user_agent: navigator.userAgent,
        p_platform: 'web'
      }).then(() => {
        // Invalidate cache to refresh list
        queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
      });
    } catch (error) {
      // Never throw - audit logging should never block the main action
      console.error('Audit log error (non-blocking):', error);
    }
  };

  return {
    auditLogs: auditLogs || [],
    isLoading,
    refetch,
    logEvent,
    hasAccess,
    historyDays,
  };
};
