import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { History, ChevronDown, ChevronRight, Mail, Users, AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductUpdateLog {
  id: string;
  batch_id: string;
  subject_fr: string | null;
  subject_en: string | null;
  title_fr: string | null;
  title_en: string | null;
  recipient_email: string;
  recipient_user_id: string;
  recipient_language: string;
  status: string;
  error_message: string | null;
  sent_at: string;
}

interface BatchGroup {
  batch_id: string;
  subject_fr: string | null;
  subject_en: string | null;
  title_fr: string | null;
  title_en: string | null;
  sent_at: string;
  recipients: ProductUpdateLog[];
  successCount: number;
  errorCount: number;
}

export function ProductUpdateLogsTable() {
  const { language } = useLanguage();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["product-update-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_update_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ProductUpdateLog[];
    },
  });

  // Group logs by batch_id
  const batches: BatchGroup[] = logs
    ? Object.values(
        logs.reduce((acc: Record<string, BatchGroup>, log) => {
          if (!acc[log.batch_id]) {
            acc[log.batch_id] = {
              batch_id: log.batch_id,
              subject_fr: log.subject_fr,
              subject_en: log.subject_en,
              title_fr: log.title_fr,
              title_en: log.title_en,
              sent_at: log.sent_at,
              recipients: [],
              successCount: 0,
              errorCount: 0,
            };
          }
          acc[log.batch_id].recipients.push(log);
          if (log.status === "sent") {
            acc[log.batch_id].successCount++;
          } else {
            acc[log.batch_id].errorCount++;
          }
          return acc;
        }, {})
      ).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    : [];

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "PPP 'à' HH:mm", {
      locale: language === "fr" ? fr : enUS,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {language === "fr" ? "Erreur" : "Error"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {language === "fr"
              ? "Impossible de charger l'historique des emails."
              : "Unable to load email history."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {language === "fr" ? "Historique des mises à jour produit" : "Product Update History"}
        </CardTitle>
        <CardDescription>
          {language === "fr"
            ? "Liste des emails de mise à jour envoyés aux utilisateurs."
            : "List of product update emails sent to users."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {language === "fr"
                ? "Aucun email de mise à jour envoyé pour le moment."
                : "No product update emails sent yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map(batch => (
              <Collapsible
                key={batch.batch_id}
                open={expandedBatches.has(batch.batch_id)}
                onOpenChange={() => toggleBatch(batch.batch_id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4 text-left">
                        {expandedBatches.has(batch.batch_id) ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {language === "fr" 
                              ? batch.subject_fr || batch.subject_en || "Sans sujet"
                              : batch.subject_en || batch.subject_fr || "No subject"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(batch.sent_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {batch.recipients.length}
                        </Badge>
                        {batch.successCount > 0 && (
                          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {batch.successCount}
                          </Badge>
                        )}
                        {batch.errorCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {batch.errorCount}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>{language === "fr" ? "Langue" : "Language"}</TableHead>
                            <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batch.recipients.map(recipient => (
                            <TableRow key={recipient.id}>
                              <TableCell className="font-mono text-sm">
                                {recipient.recipient_email}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {recipient.recipient_language === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {recipient.status === "sent" ? (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {language === "fr" ? "Envoyé" : "Sent"}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {language === "fr" ? "Erreur" : "Error"}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
