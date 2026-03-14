import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auditLogger";

export interface FormalNotice {
  id: string;
  invoice_id: string;
  user_id: string;
  recipient: string | null;
  recipient_address: string | null;
  subject: string | null;
  body: string | null;
  due_at: string | null;
  status: string;
  sent_at: string | null;
  sent_to: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormalNoticeInput {
  recipient?: string;
  recipient_address?: string;
  subject?: string;
  body?: string;
  due_at?: string;
  status?: string;
  sent_at?: string;
  sent_to?: string;
}

export const useFormalNotices = (invoiceId?: string) => {
  const [notices, setNotices] = useState<FormalNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, username } = useAuth();
  const { toast } = useToast();

  const fetchNotices = useCallback(async () => {
    if (!user || !invoiceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_formal_notices" as any)
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices((data || []) as unknown as FormalNotice[]);
    } catch (error) {
      console.error("Error fetching formal notices:", error);
    } finally {
      setLoading(false);
    }
  }, [user, invoiceId]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const createNotice = async (invoiceId: string, data: FormalNoticeInput, invoiceNumber?: string): Promise<FormalNotice | null> => {
    if (!user) return null;
    try {
      const { data: notice, error } = await supabase
        .from("invoice_formal_notices" as any)
        .insert({
          invoice_id: invoiceId,
          user_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'formal_notice_created',
        description: `Mise en demeure créée pour la facture ${invoiceNumber || invoiceId}`,
        relatedEntityType: 'invoice',
        relatedEntityId: invoiceId,
        metadata: { status: data.status || 'draft' },
      });

      await fetchNotices();
      return notice as unknown as FormalNotice;
    } catch (error) {
      console.error("Error creating formal notice:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la mise en demeure",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNotice = async (noticeId: string, data: FormalNoticeInput, invoiceNumber?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("invoice_formal_notices" as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", noticeId);

      if (error) throw error;

      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'formal_notice_updated',
        description: `Mise en demeure modifiée pour la facture ${invoiceNumber || ''}`,
        relatedEntityType: 'invoice',
        relatedEntityId: noticeId,
        metadata: { changes: Object.keys(data) },
      });

      await fetchNotices();
      return true;
    } catch (error) {
      console.error("Error updating formal notice:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la mise en demeure",
        variant: "destructive",
      });
      return false;
    }
  };

  const markAsSent = async (noticeId: string, sentTo: string, invoiceNumber?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("invoice_formal_notices" as any)
        .update({
          status: 'sent',
          sent_at: now,
          sent_to: sentTo,
          updated_at: now,
        })
        .eq("id", noticeId);

      if (error) throw error;

      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'formal_notice_sent',
        description: `Mise en demeure envoyée pour la facture ${invoiceNumber || ''} à ${sentTo}`,
        relatedEntityType: 'invoice',
        relatedEntityId: noticeId,
        metadata: { sent_to: sentTo },
      });

      await fetchNotices();
      return true;
    } catch (error) {
      console.error("Error marking formal notice as sent:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la mise en demeure comme envoyée",
        variant: "destructive",
      });
      return false;
    }
  };

  const latestNotice = notices.length > 0 ? notices[0] : null;

  return {
    notices,
    latestNotice,
    loading,
    createNotice,
    updateNotice,
    markAsSent,
    refetch: fetchNotices,
  };
};
