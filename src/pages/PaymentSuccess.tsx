import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const invoiceId = searchParams.get("invoice");
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!invoiceId) {
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment-status", {
          body: { invoiceId },
        });

        if (error) throw error;

        if (data?.updated) {
          toast.success(
            language === "fr" 
              ? "Facture marquée comme payée" 
              : "Invoice marked as paid"
          );
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [invoiceId, language]);

  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            {isVerifying ? (
              <Loader2 className="w-10 h-10 text-green-600 dark:text-green-400 animate-spin" />
            ) : (
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {language === "fr" ? "Paiement réussi !" : "Payment Successful!"}
          </CardTitle>
          <CardDescription className="text-base">
            {isVerifying ? (
              language === "fr" 
                ? "Vérification du paiement en cours..." 
                : "Verifying payment..."
            ) : (
              language === "fr" 
                ? "Votre paiement a été traité avec succès." 
                : "Your payment has been processed successfully."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoiceId && (
            <p className="text-sm text-muted-foreground">
              {language === "fr" 
                ? `Numéro de facture : ${invoiceId}` 
                : `Invoice ID: ${invoiceId}`}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {language === "fr" 
              ? "Merci pour votre paiement. Vous pouvez fermer cette fenêtre." 
              : "Thank you for your payment. You can close this window."}
          </p>
          <Button 
            onClick={handleClose}
            className="w-full"
          >
            {language === "fr" ? "Fermer" : "Close"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
