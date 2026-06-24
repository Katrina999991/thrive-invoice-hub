import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { Crown, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FeatureAccess = "full" | "partial" | "none";

interface FeatureDisplay {
  labelEn: string;
  labelFr: string;
  access: FeatureAccess;
}

/**
 * Determines feature access level based on actual plan capabilities.
 * This ensures the dashboard never contradicts the real feature availability.
 */
function getFeatureAccessList(planType: string): FeatureDisplay[] {
  return [
    {
      labelEn: "Time Tracking",
      labelFr: "Suivi des heures",
      access: "full", // Included in ALL plans
    },
    {
      labelEn: "PDF Export",
      labelFr: "Export PDF",
      access: planType === "free" ? "none" : "full",
    },
    {
      labelEn: "Categories",
      labelFr: "Catégories",
      access: "full", // Included in ALL plans
    },
    {
      labelEn: "Quotes",
      labelFr: "Devis",
      access: planType === "free" ? "none" : "full",
    },
    {
      labelEn: "Reports",
      labelFr: "Rapports",
      access: planType === "pro" ? "full" : planType === "premium" ? "partial" : "partial",
    },
    {
      labelEn: "Final Reminder",
      labelFr: "Dernier rappel",
      access: planType === "free" ? "none" : "full",
    },
    {
      labelEn: "Custom Emails",
      labelFr: "Emails perso",
      access: planType === "pro" ? "full" : "none",
    },
    {
      labelEn: "Formal Notice",
      labelFr: "Mise en demeure",
      access: planType === "pro" ? "full" : "none",
    },
  ];
}

export const SubscriptionLimitsCard = () => {
  const { planLimits, currentSubscription, isLoading } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (isLoading || !planLimits) {
    return null;
  }

  const getPlanIcon = () => {
    switch (planLimits.plan_type) {
      case 'pro':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'premium':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default:
        return <Zap className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPlanName = () => {
    const planNames = {
      free: language === 'fr' ? 'Gratuit' : 'Free',
      premium: 'Premium',
      pro: 'Pro'
    };
    return planNames[planLimits.plan_type];
  };

  const calculatePercentage = (used: number, max: number | null) => {
    if (max === null) return 0;
    return Math.min((used / max) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  const titles = {
    en: {
      title: "Subscription & Usage",
      description: "Monitor your plan limits and usage",
      invoices: "Invoices this month",
      expenses: "Expenses this month",
      unlimited: "Unlimited",
      upgradeToPremium: "Upgrade to Premium",
      upgradeToPro: "Upgrade to Pro",
      bestPlan: "You're on the best plan 🎉",
      features: "Features",
      limited: "Limited",
    },
    fr: {
      title: "Abonnement et utilisation",
      description: "Surveillez vos limites et votre utilisation",
      invoices: "Factures ce mois-ci",
      expenses: "Dépenses ce mois-ci",
      unlimited: "Illimité",
      upgradeToPremium: "Passer à Premium",
      upgradeToPro: "Passer à Pro",
      bestPlan: "Vous êtes sur le meilleur plan 🎉",
      features: "Fonctionnalités",
      limited: "Limité",
    }
  };

  const t = titles[language];

  const features = getFeatureAccessList(planLimits.plan_type);

  const getDotColor = (access: FeatureAccess) => {
    if (access === "full") return "bg-green-500";
    if (access === "partial") return "bg-amber-500";
    return "bg-muted-foreground/30";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon()}
            <CardTitle>{t.title}</CardTitle>
          </div>
          <Badge variant={planLimits.plan_type === 'free' ? 'secondary' : 'default'}>
            {getPlanName()}
          </Badge>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoices */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t.invoices}</span>
            <span className="text-muted-foreground">
              {planLimits.invoices_used} / {planLimits.max_invoices_per_month ?? t.unlimited}
            </span>
          </div>
          {planLimits.max_invoices_per_month !== null && (
            <Progress 
              value={calculatePercentage(planLimits.invoices_used, planLimits.max_invoices_per_month)}
              indicatorClassName={getProgressColor(calculatePercentage(planLimits.invoices_used, planLimits.max_invoices_per_month))}
            />
          )}
        </div>

        {/* Expenses */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t.expenses}</span>
            <span className="text-muted-foreground">
              {planLimits.expenses_used} / {planLimits.max_expenses_per_month ?? t.unlimited}
            </span>
          </div>
          {planLimits.max_expenses_per_month !== null && (
            <Progress 
              value={calculatePercentage(planLimits.expenses_used, planLimits.max_expenses_per_month)}
              indicatorClassName={getProgressColor(calculatePercentage(planLimits.expenses_used, planLimits.max_expenses_per_month))}
            />
          )}
        </div>

        {/* Features */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium mb-3">
            {t.features}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {features.map((feature) => (
              <div key={feature.labelEn} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(feature.access)}`} />
                <span className={feature.access === "none" ? "text-muted-foreground" : ""}>
                  {language === 'fr' ? feature.labelFr : feature.labelEn}
                </span>
                {feature.access === "partial" && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-400 text-amber-600">
                    {t.limited}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {planLimits.plan_type === 'pro' ? (
          <p className="text-center text-sm text-muted-foreground font-medium">{t.bestPlan}</p>
        ) : (
          <Button className="w-full" variant="default" onClick={() => navigate('/dashboard/pricing')}>
            <Crown className="h-4 w-4 mr-2" />
            {planLimits.plan_type === 'free' ? t.upgradeToPremium : t.upgradeToPro}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
