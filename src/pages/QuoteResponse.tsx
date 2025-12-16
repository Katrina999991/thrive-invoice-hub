import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Check, X, FileText, Calendar, DollarSign, Clock, Building2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteData {
  id: string;
  quote_number: string;
  status: string;
  issue_date: string;
  expiry_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  responded_at: string | null;
  client_response_note: string | null;
  isExpired: boolean;
  canRespond: boolean;
  clients: {
    name: string;
    email: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  quote_items: QuoteItem[];
}

interface CompanyData {
  name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string | null;
}

const QuoteResponse = () => {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState<"accepted" | "refused" | null>(null);

  // Detect language from browser
  const browserLang = navigator.language.startsWith("fr") ? "fr" : "en";
  const dateLocale = browserLang === "fr" ? fr : enUS;

  const t = {
    fr: {
      loading: "Chargement du devis...",
      error: "Erreur",
      invalidLink: "Lien invalide ou expiré",
      backToSite: "Retour au site",
      quote: "Devis",
      from: "De",
      issuedOn: "Émis le",
      expiresOn: "Expire le",
      expired: "Expiré",
      status: "Statut",
      draft: "Brouillon",
      sent: "Envoyé",
      accepted: "Accepté",
      refused: "Refusé",
      items: "Articles",
      description: "Description",
      qty: "Qté",
      unitPrice: "Prix unit.",
      total: "Total",
      subtotal: "Sous-total",
      taxes: "Taxes",
      totalAmount: "Total",
      notes: "Notes",
      terms: "Conditions",
      yourResponse: "Votre réponse",
      addNote: "Ajouter une note (optionnel)",
      notePlaceholder: "Commentaires ou questions...",
      acceptQuote: "Accepter le devis",
      refuseQuote: "Refuser le devis",
      alreadyResponded: "Vous avez déjà répondu à ce devis",
      respondedOn: "Répondu le",
      yourNote: "Votre note",
      quoteExpired: "Ce devis a expiré",
      thankYou: "Merci pour votre réponse !",
      quoteAccepted: "Vous avez accepté le devis",
      quoteRefused: "Vous avez refusé le devis",
      contactUs: "L'entreprise vous contactera bientôt.",
      processing: "Traitement...",
    },
    en: {
      loading: "Loading quote...",
      error: "Error",
      invalidLink: "Invalid or expired link",
      backToSite: "Back to site",
      quote: "Quote",
      from: "From",
      issuedOn: "Issued on",
      expiresOn: "Expires on",
      expired: "Expired",
      status: "Status",
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      refused: "Refused",
      items: "Items",
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      total: "Total",
      subtotal: "Subtotal",
      taxes: "Taxes",
      totalAmount: "Total",
      notes: "Notes",
      terms: "Terms",
      yourResponse: "Your Response",
      addNote: "Add a note (optional)",
      notePlaceholder: "Comments or questions...",
      acceptQuote: "Accept Quote",
      refuseQuote: "Refuse Quote",
      alreadyResponded: "You have already responded to this quote",
      respondedOn: "Responded on",
      yourNote: "Your note",
      quoteExpired: "This quote has expired",
      thankYou: "Thank you for your response!",
      quoteAccepted: "You have accepted the quote",
      quoteRefused: "You have refused the quote",
      contactUs: "The company will contact you soon.",
      processing: "Processing...",
    },
  };

  const text = t[browserLang];

  useEffect(() => {
    const fetchQuote = async () => {
      if (!token) {
        setError(text.invalidLink);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("get-quote-by-token", {
          body: null,
          method: "GET",
        });

        // Use fetch directly for GET request with query params
        const response = await fetch(
          `https://dkinzkawntfzkabroeib.supabase.co/functions/v1/get-quote-by-token?token=${token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(text.invalidLink);
        }

        const result = await response.json();
        setQuote(result.quote);
        setCompany(result.company);
      } catch (err: any) {
        console.error("Error fetching quote:", err);
        setError(err.message || text.invalidLink);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const handleResponse = async (response: "accepted" | "refused") => {
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `https://dkinzkawntfzkabroeib.supabase.co/functions/v1/respond-to-quote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            response,
            note: note.trim() || undefined,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit response");
      }

      setResponseSubmitted(true);
      setSubmittedResponse(response);
    } catch (err: any) {
      toast({
        title: text.error,
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(browserLang === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: text.draft,
      sent: text.sent,
      accepted: text.accepted,
      refused: text.refused,
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "refused":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{text.loading}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <X className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">{text.error}</h2>
            <p className="text-muted-foreground text-center">{error || text.invalidLink}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            {submittedResponse === "accepted" ? (
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
            <h2 className="text-xl font-semibold mb-2">{text.thankYou}</h2>
            <p className="text-muted-foreground text-center mb-4">
              {submittedResponse === "accepted" ? text.quoteAccepted : text.quoteRefused}
            </p>
            <p className="text-sm text-muted-foreground">{text.contactUs}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Company Header */}
        {company && (
          <div className="text-center mb-8">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-16 mx-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {company.email && <p className="text-muted-foreground">{company.email}</p>}
          </div>
        )}

        {/* Quote Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{text.quote} #{quote.quote_number}</CardTitle>
                  {quote.clients && (
                    <p className="text-muted-foreground">{quote.clients.name}</p>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                {getStatusText(quote.status)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{text.issuedOn}</p>
                  <p className="font-medium">
                    {format(new Date(quote.issue_date), "PPP", { locale: dateLocale })}
                  </p>
                </div>
              </div>
              {quote.expiry_date && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">{text.expiresOn}</p>
                    <p className={`font-medium ${quote.isExpired ? "text-destructive" : ""}`}>
                      {format(new Date(quote.expiry_date), "PPP", { locale: dateLocale })}
                      {quote.isExpired && ` (${text.expired})`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{text.totalAmount}</p>
                  <p className="font-medium text-lg">{formatCurrency(quote.total)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{text.items}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">{text.description}</th>
                    <th className="text-right py-2 font-medium">{text.qty}</th>
                    <th className="text-right py-2 font-medium">{text.unitPrice}</th>
                    <th className="text-right py-2 font-medium">{text.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.quote_items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">{item.description}</td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right py-3">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{text.subtotal}</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{text.taxes}</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>{text.totalAmount}</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        {(quote.notes || quote.terms) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {quote.notes && (
                <div>
                  <h3 className="font-medium mb-1">{text.notes}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <h3 className="font-medium mb-1">{text.terms}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Already Responded */}
        {!quote.canRespond && (quote.status === "accepted" || quote.status === "refused") && (
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                {quote.status === "accepted" ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">{text.alreadyResponded}</span>
              </div>
              {quote.responded_at && (
                <p className="text-sm text-muted-foreground">
                  {text.respondedOn}: {format(new Date(quote.responded_at), "PPP", { locale: dateLocale })}
                </p>
              )}
              {quote.client_response_note && (
                <p className="text-sm text-muted-foreground mt-2">
                  {text.yourNote}: {quote.client_response_note}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expired Message */}
        {quote.isExpired && quote.canRespond && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">{text.quoteExpired}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Section */}
        {quote.canRespond && !quote.isExpired && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">{text.yourResponse}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {text.addNote}
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={text.notePlaceholder}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleResponse("accepted")}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? text.processing : text.acceptQuote}
                </Button>
                <Button
                  onClick={() => handleResponse("refused")}
                  disabled={submitting}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? text.processing : text.refuseQuote}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by GestionFlow
        </p>
      </div>
    </div>
  );
};

export default QuoteResponse;
