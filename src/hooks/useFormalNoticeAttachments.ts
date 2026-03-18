import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auditLogger";

export interface FormalNoticeAttachment {
  id: string;
  formal_notice_id: string;
  category: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export const useFormalNoticeAttachments = (noticeId?: string) => {
  const [attachments, setAttachments] = useState<FormalNoticeAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user, username } = useAuth();
  const { toast } = useToast();

  const fetchAttachments = useCallback(async () => {
    if (!user || !noticeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("formal_notice_attachments" as any)
        .select("*")
        .eq("formal_notice_id", noticeId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      setAttachments((data || []) as unknown as FormalNoticeAttachment[]);
    } catch (e) {
      console.error("Error fetching attachments:", e);
    } finally {
      setLoading(false);
    }
  }, [user, noticeId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const validateFile = (file: File, lang: string): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return lang === 'fr'
        ? `Type de fichier non supporté : ${file.type}. Formats acceptés : PDF, PNG, JPG, WEBP.`
        : `Unsupported file type: ${file.type}. Accepted formats: PDF, PNG, JPG, WEBP.`;
    }
    if (file.size > MAX_SIZE) {
      return lang === 'fr'
        ? `Le fichier dépasse la taille maximale de 10 Mo.`
        : `File exceeds maximum size of 10 MB.`;
    }
    if (attachments.length >= MAX_FILES) {
      return lang === 'fr'
        ? `Maximum ${MAX_FILES} fichiers par mise en demeure.`
        : `Maximum ${MAX_FILES} files per formal notice.`;
    }
    return null;
  };

  const uploadFile = async (
    file: File,
    category: string = 'proof_of_sending',
    lang: string = 'en',
  ): Promise<FormalNoticeAttachment | null> => {
    if (!user || !noticeId) return null;

    const validationError = validateFile(file, lang);
    if (validationError) {
      toast({ title: lang === 'fr' ? 'Erreur' : 'Error', description: validationError, variant: 'destructive' });
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const storagePath = `${user.id}/${noticeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('formal-notice-proofs')
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('formal-notice-proofs')
        .getPublicUrl(storagePath);

      // For private buckets we use signed URLs instead
      const { data: signedData } = await supabase.storage
        .from('formal-notice-proofs')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedData?.signedUrl || urlData.publicUrl;

      const { data: attachment, error: insertError } = await supabase
        .from("formal_notice_attachments" as any)
        .insert({
          formal_notice_id: noticeId,
          category,
          file_name: file.name,
          file_url: storagePath, // Store path, generate signed URL on demand
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'formal_notice_proof_uploaded',
        description: lang === 'fr' ? 'Fichier de preuve téléversé' : 'Proof file uploaded',
        relatedEntityType: 'formal_notice',
        relatedEntityId: noticeId,
        metadata: { file_name: file.name, category },
      });

      await fetchAttachments();
      return attachment as unknown as FormalNoticeAttachment;
    } catch (e) {
      console.error("Error uploading proof file:", e);
      toast({
        title: lang === 'fr' ? 'Erreur' : 'Error',
        description: lang === 'fr'
          ? "Impossible de téléverser le fichier"
          : 'Unable to upload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachment: FormalNoticeAttachment, lang: string = 'en'): Promise<boolean> => {
    if (!user) return false;
    try {
      // Delete from storage
      await supabase.storage
        .from('formal-notice-proofs')
        .remove([attachment.file_url]);

      // Delete metadata record
      const { error } = await supabase
        .from("formal_notice_attachments" as any)
        .delete()
        .eq("id", attachment.id);
      if (error) throw error;

      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'formal_notice_proof_deleted',
        description: lang === 'fr' ? 'Fichier de preuve supprimé' : 'Proof file deleted',
        relatedEntityType: 'formal_notice',
        relatedEntityId: noticeId || '',
        metadata: { file_name: attachment.file_name },
      });

      await fetchAttachments();
      return true;
    } catch (e) {
      console.error("Error deleting attachment:", e);
      toast({
        title: lang === 'fr' ? 'Erreur' : 'Error',
        description: lang === 'fr'
          ? 'Impossible de supprimer le fichier'
          : 'Unable to delete file',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('formal-notice-proofs')
      .createSignedUrl(storagePath, 60 * 60); // 1 hour
    if (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  const downloadFile = async (attachment: FormalNoticeAttachment) => {
    const url = await getSignedUrl(attachment.file_url);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const proofOfSendingFiles = attachments.filter(a => a.category === 'proof_of_sending');
  const hasProofFiles = proofOfSendingFiles.length > 0;
  const proofOfReceiptFiles = attachments.filter(a => a.category === 'proof_of_receipt');
  const hasReceiptFiles = proofOfReceiptFiles.length > 0;

  return {
    attachments,
    proofOfSendingFiles,
    hasProofFiles,
    proofOfReceiptFiles,
    hasReceiptFiles,
    loading,
    uploading,
    uploadFile,
    deleteAttachment,
    getSignedUrl,
    downloadFile,
    refetch: fetchAttachments,
    MAX_FILES,
    MAX_SIZE,
    ACCEPTED_TYPES,
  };
};
