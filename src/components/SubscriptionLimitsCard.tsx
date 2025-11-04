import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { Crown, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      upgrade: "Upgrade Plan",
    },
    fr: {
      title: "Abonnement et utilisation",
      description: "Surveillez vos limites et votre utilisation",
      invoices: "Factures ce mois-ci",
      expenses: "Dépenses ce mois-ci",
      unlimited: "Illimité",
      upgrade: "Améliorer le plan",
    }
  };

  const t = titles[language];

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
              className={getProgressColor(calculatePercentage(planLimits.invoices_used, planLimits.max_invoices_per_month))}
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
              className={getProgressColor(calculatePercentage(planLimits.expenses_used, planLimits.max_expenses_per_month))}
            />
          )}
        </div>

        {/* Features */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium mb-3">
            {language === 'fr' ? 'Fonctionnalités' : 'Features'}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${planLimits.pdf_export ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>PDF Export</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${planLimits.category_management ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{language === 'fr' ? 'Catégories' : 'Categories'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${planLimits.all_reports ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{language === 'fr' ? 'Tous rapports' : 'All Reports'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${planLimits.custom_email_templates ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{language === 'fr' ? 'Emails perso' : 'Custom Emails'}</span>
            </div>
          </div>
        </div>

        {planLimits.plan_type !== 'pro' && (
          <Button className="w-full" variant="default" onClick={() => navigate('/dashboard/pricing')}>
            {t.upgrade}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};