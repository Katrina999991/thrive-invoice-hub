import { supabase } from "@/integrations/supabase/client";

export type AuditEventCategory = 
  | 'authentication'
  | 'billing'
  | 'sales'
  | 'products'
  | 'exports'
  | 'settings';

interface LogAuditEventOptions {
  userId: string;
  userName?: string;
  companyId?: string | null;
  category: AuditEventCategory;
  eventType: string;
  description: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event. This function is fire-and-forget and will never throw.
 * Use this for logging events without blocking the main action.
 */
export const logAuditEvent = async (options: LogAuditEventOptions): Promise<void> => {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id: options.userId,
      p_user_name: options.userName || 'Unknown',
      p_company_id: options.companyId || null,
      p_category: options.category,
      p_event_type: options.eventType,
      p_description: options.description,
      p_related_entity_type: options.relatedEntityType || null,
      p_related_entity_id: options.relatedEntityId || null,
      p_metadata: options.metadata || {},
      p_ip_address: null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_platform: 'web'
    });
  } catch (error) {
    // Never throw - audit logging should never block the main action
    console.error('Audit log error (non-blocking):', error);
  }
};
