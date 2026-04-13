import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BadgePercent, ArrowRight } from "lucide-react";

/**
 * Banner shown to Free plan users displaying how much they've paid
 * in GestionFlow fees this month, with an upgrade CTA.
 */
export const GestionFlowFeeBanner = () => {
  const { user } = useAuth();
  const { planLimits } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const currentPlan = planLimits?.plan_type ?? "free";
  const isFree = currentPlan === "free";

  // Calculate total paid invoices this month to estimate GestionFlow fees
  const { data: feesThisMonth } = useQuery({
    queryKey: ["gestionflow-fees-this-month", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get invoices paid this month that have a payment_link (Stripe payments)
      const { data, error } = await supabase
        .from("invoices")
        .select("total")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .not("payment_link", "is", null)
        .gte("paid_at", startOfMonth);

      if (error || !data) return 0;

      const totalPaid = data.reduce((sum, inv) => sum + (inv.total || 0), 0);
      // Free plan = 2% GestionFlow fee
      return Math.round(totalPaid * 0.02 * 100) / 100;
    },
    enabled: !!user?.id && isFree,
    staleTime: 60000,
  });

  if (!isFree || !feesThisMonth || feesThisMonth <= 0) return null;

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <BadgePercent className="h-5 w-5 text-primary" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ml-2">
        <div>
          <p className="font-semibold text-foreground">
            {language === "fr"
              ? `Vous avez payé ${feesThisMonth.toFixed(2)} $ en frais GestionFlow ce mois-ci`
              : `You paid $${feesThisMonth.toFixed(2)} in GestionFlow fees this month`}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === "fr"
              ? "Passez à Premium pour payer 0 $"
              : "Upgrade to Premium to pay $0"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/dashboard/pricing")}
          className="shrink-0 gap-1"
        >
          {language === "fr" ? "Passer à Premium" : "Upgrade to Premium"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};
