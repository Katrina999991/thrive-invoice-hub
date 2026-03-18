import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload, Loader2, FileText, Image, Trash2, Download, Eye, X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { FormalNoticeAttachment } from "@/hooks/useFormalNoticeAttachments";

interface ProofFileSectionProps {
  attachments: FormalNoticeAttachment[];
  uploading: boolean;
  hasProofFiles: boolean;
  maxFiles: number;
  sectionTitle?: string;
  uploadLabel?: string;
  helperText?: string;
  onUpload: (file: File) => Promise<FormalNoticeAttachment | null>;
  onDelete: (attachment: FormalNoticeAttachment) => Promise<boolean>;
  onDownload: (attachment: FormalNoticeAttachment) => void;
  onGetSignedUrl: (path: string) => Promise<string | null>;
  lang: 'fr' | 'en';
  disabled?: boolean;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (mime: string | null) =>
  mime?.startsWith('image/') ?? false;

export const ProofFileSection = ({
  attachments,
  uploading,
  hasProofFiles,
  maxFiles,
  sectionTitle,
  uploadLabel,
  helperText,
  onUpload,
  onDelete,
  onDownload,
  onGetSignedUrl,
  lang,
  disabled,
}: ProofFileSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onUpload(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFileChange(e.dataTransfer.files);
  };

  const handlePreview = async (attachment: FormalNoticeAttachment) => {
    const url = await onGetSignedUrl(attachment.file_url);
    if (!url) return;
    if (isImage(attachment.mime_type)) {
      setPreviewUrl(url);
      setPreviewName(attachment.file_name);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (attachment: FormalNoticeAttachment) => {
    setDeletingId(attachment.id);
    await onDelete(attachment);
    setDeletingId(null);
  };

  const canUpload = attachments.length < maxFiles && !disabled;

  return (
    <>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">
          {sectionTitle || t('Fichiers de preuve d\'envoi', 'Proof of sending files')}
        </h4>

        {/* Upload area */}
        {canUpload && (
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/40'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileChange(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Upload className="h-4 w-4 mr-2" />
              }
              {t('Ajouter une preuve', 'Upload proof')}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {t(
                "Ajoutez un reçu postal, une capture d'écran de suivi, une preuve de messagerie ou tout autre document démontrant que la mise en demeure a été envoyée.",
                "Upload a postal receipt, tracking screenshot, courier proof, or any document showing that the formal notice was sent.",
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPG, WEBP · Max 10 MB · {attachments.length}/{maxFiles} {t('fichiers', 'files')}
            </p>
          </div>
        )}

        {/* File list */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((att) => (
              <Card key={att.id} className="border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="shrink-0">
                    {isImage(att.mime_type)
                      ? <Image className="h-5 w-5 text-muted-foreground" />
                      : <FileText className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.file_size)}
                      {att.uploaded_at && ` · ${new Date(att.uploaded_at).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(att)}
                      title={t('Voir', 'View')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDownload(att)}
                      title={t('Télécharger', 'Download')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(att)}
                      disabled={deletingId === att.id}
                      title={t('Supprimer', 'Delete')}
                    >
                      {deletingId === att.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Image preview lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="p-4">
              <p className="text-sm font-medium mb-2">{previewName}</p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="max-w-full max-h-[70vh] object-contain mx-auto rounded"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
