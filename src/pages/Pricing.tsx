import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Crown, TrendingUp, Zap, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/UpgradeDialog";

const Pricing = () => {
  const { availablePlans, currentSubscription, isLoading, planLimits } = useSubscription();
  const { language } = useLanguage();
  const { createCheckout, checkSubscription, openCustomerPortal, scheduleUpgrade, isLoading: stripeLoading } = useStripeCheckout();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hasActiveStripeSubscription, setHasActiveStripeSubscription] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<'premium' | 'pro' | null>(null);

  // Check subscription status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkSubscription();
      if (status?.subscribed) {
        setHasActiveStripeSubscription(true);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Check for successful subscription from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast.success(
        language === 'fr' 
          ? 'Abonnement activé avec succès !' 
          : 'Subscription activated successfully!'
      );
      // Remove the query parameter
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh subscription status
      checkSubscription();
    }
  }, [language]);

  const handleUpgrade = async (planType: string) => {
    const current = planLimits?.plan_type ?? 'free';

    // If already on this plan
    if (planType === current) {
      toast.info(t.currentPlan);
      return;
    }

    const order = ['free', 'premium', 'pro'];
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(planType as any);

    // Upgrade (higher tier)
    if (targetIndex > currentIndex) {
      // Special case: premium to pro - show dialog
      if (current === 'premium' && planType === 'pro') {
        setPendingUpgradePlan('pro');
        setShowUpgradeDialog(true);
        return;
      }
      
      // Other upgrades - go directly to Stripe Checkout
      await createCheckout(planType as 'premium' | 'pro', billingCycle);
      return;
    }

    // Downgrade (lower tier, including to Free) -> open Customer Portal
    toast.info(
      language === 'fr'
        ? "Pour rétrograder ou annuler, nous allons ouvrir le portail client Stripe."
        : "To downgrade or cancel, we will open the Stripe customer portal."
    );
    await openCustomerPortal();
  };

  const handleImmediateUpgrade = async () => {
    if (pendingUpgradePlan) {
      await createCheckout(pendingUpgradePlan, billingCycle);
      setPendingUpgradePlan(null);
    }
  };

  const handleScheduledUpgrade = async () => {
    if (pendingUpgradePlan) {
      await scheduleUpgrade(pendingUpgradePlan, billingCycle);
      setPendingUpgradePlan(null);
    }
  };

  const translations = {
    en: {
      title: "Choose Your Plan",
      subtitle: "Select the perfect plan for your business needs",
      monthly: "Monthly",
      yearly: "Yearly",
      saveWithYearly: "Save 17% with yearly billing",
      currentPlan: "Current Plan",
      upgrade: "Subscribe",
      downgrade: "Downgrade",
      manageSubscription: "Manage Subscription",
      choosePlan: "Choose Plan",
      perMonth: "/month",
      perYear: "/year",
      billedMonthly: "billed monthly",
      billedYearly: "billed yearly",
      features: {
        companies: "companies",
        company: "company",
        clients: "clients",
        invoices: "invoices/month",
        expenses: "expenses/month",
        pdfExport: "PDF Export",
        emailBasic: "Email Invoice Sending (basic)",
        revenueReport: "Revenue Report",
        invoiceTemplate: "invoice template",
        invoiceTemplates: "invoice templates",
        categoryManagement: "Category Management",
        taxReport: "Tax Report",
        allReports: "All Reports",
        customEmails: "Custom Email Templates",
        unlimited: "Unlimited",
      },
      planDescriptions: {
        free: "Ideal for freelancers just starting out",
        premium: "For small businesses and independent professionals",
        pro: "For growing businesses or multi-company operations",
      }
    },
    fr: {
      title: "Choisissez votre plan",
      subtitle: "Sélectionnez le plan parfait pour vos besoins",
      monthly: "Mensuel",
      yearly: "Annuel",
      saveWithYearly: "Économisez 17% avec la facturation annuelle",
      currentPlan: "Plan actuel",
      upgrade: "S'abonner",
      downgrade: "Rétrograder",
      manageSubscription: "Gérer l'abonnement",
      choosePlan: "Choisir ce plan",
      perMonth: "/mois",
      perYear: "/an",
      billedMonthly: "facturé mensuellement",
      billedYearly: "facturé annuellement",
      features: {
        companies: "entreprises",
        company: "entreprise",
        clients: "clients",
        invoices: "factures/mois",
        expenses: "dépenses/mois",
        pdfExport: "Téléchargement PDF",
        emailBasic: "Envoi de factures par courriel (basique)",
        revenueReport: "Rapport de revenus",
        invoiceTemplate: "modèle de facture",
        invoiceTemplates: "modèles de factures",
        categoryManagement: "Gestion des catégories",
        taxReport: "Rapport des taxes",
        allReports: "Tous les rapports",
        customEmails: "Personnalisation des emails",
        unlimited: "Illimité",
      },
      planDescriptions: {
        free: "Idéale pour les travailleurs autonomes qui débutent",
        premium: "Pour petites entreprises et professionnels indépendants",
        pro: "Pour entreprises en croissance ou multi-compagnies",
      }
    }
  };

  const t = translations[language];

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 'premium':
        return <TrendingUp className="h-6 w-6 text-blue-500" />;
      default:
        return <Zap className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPlanFeatures = (plan: any) => {
    const features = [];
    
    // Companies
    features.push({
      text: `${plan.max_companies ?? t.features.unlimited} ${plan.max_companies === 1 ? t.features.company : t.features.companies}`,
      included: true
    });
    
    // Clients
    features.push({
      text: `${plan.max_clients ?? t.features.unlimited} ${t.features.clients}`,
      included: true
    });
    
    // Invoices
    features.push({
      text: `${plan.max_invoices_per_month ?? t.features.unlimited} ${t.features.invoices}`,
      included: true
    });
    
    // Expenses
    features.push({
      text: `${plan.max_expenses_per_month ?? t.features.unlimited} ${t.features.expenses}`,
      included: true
    });

    // Basic features for free
    if (plan.plan_type === 'free') {
      features.push({ text: t.features.emailBasic, included: true });
      features.push({ text: `1 ${t.features.invoiceTemplate} (Classique)`, included: true });
      features.push({ text: t.features.revenueReport, included: true });
    }

    // PDF Export
    if (plan.pdf_export) {
      features.push({ text: t.features.pdfExport, included: true });
    }

    // Additional template
    if (plan.plan_type === 'premium') {
      features.push({ text: `1 ${t.features.invoiceTemplate} ${language === 'fr' ? 'additionnel' : 'additional'} (Moderne)`, included: true });
    }

    // All templates
    if (plan.all_invoice_templates) {
      features.push({ text: `${language === 'fr' ? 'Tous les' : 'All'} ${t.features.invoiceTemplates}`, included: true });
    }

    // Category management
    if (plan.category_management) {
      features.push({ text: t.features.categoryManagement, included: true });
    }

    // Tax report
    if (plan.plan_type === 'premium') {
      features.push({ text: t.features.taxReport, included: true });
    }

    // All reports
    if (plan.all_reports) {
      features.push({ text: t.features.allReports, included: true });
    }

    // Custom emails
    if (plan.custom_email_templates) {
      features.push({ text: t.features.customEmails, included: true });
    }

    return features;
  };

  const getButtonText = (planType: string) => {
    if (isCurrentPlan(planType)) return t.currentPlan;

    if (!planLimits) return planType === 'free' && !hasActiveStripeSubscription ? t.currentPlan : t.choosePlan;

    const currentPlanIndex = ['free', 'premium', 'pro'].indexOf(planLimits.plan_type);
    const targetPlanIndex = ['free', 'premium', 'pro'].indexOf(planType);

    if (targetPlanIndex > currentPlanIndex) return t.upgrade;
    return t.downgrade;
  };

  const isCurrentPlan = (planType: string) => {
    if (planLimits) return planLimits.plan_type === planType;
    if (planType === 'free' && !hasActiveStripeSubscription) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
        <p className="text-muted-foreground text-lg">{t.subtitle}</p>
        {hasActiveStripeSubscription && (
          <Button 
            onClick={openCustomerPortal} 
            variant="outline" 
            className="mt-4"
            disabled={stripeLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t.manageSubscription}
          </Button>
        )}
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Label htmlFor="billing-toggle" className={billingCycle === 'monthly' ? 'font-semibold' : ''}>
          {t.monthly}
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-toggle" className={billingCycle === 'yearly' ? 'font-semibold' : ''}>
          {t.yearly}
        </Label>
        {billingCycle === 'yearly' && (
          <Badge variant="secondary" className="ml-2">
            {t.saveWithYearly}
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {availablePlans?.map((plan) => {
          const features = getPlanFeatures(plan);
          const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
          const isCurrent = isCurrentPlan(plan.plan_type);
          const isPro = plan.plan_type === 'pro';

          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPro ? 'border-primary shadow-lg scale-105' : ''} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
            >
              {isPro && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1">
                    {language === 'fr' ? 'Plus populaire' : 'Most Popular'}
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {getPlanIcon(plan.plan_type)}
                  {isCurrent && (
                    <Badge variant="outline">{t.currentPlan}</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {language === 'fr' ? plan.name_fr : plan.name_en}
                </CardTitle>
                <CardDescription>
                  {language === 'fr' ? plan.description_fr : plan.description_en}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">
                    {billingCycle === 'monthly' ? t.perMonth : t.perYear}
                  </span>
                  {price > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {billingCycle === 'monthly' ? t.billedMonthly : t.billedYearly}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isCurrent ? 'outline' : (isPro ? 'default' : 'secondary')}
                  disabled={isCurrent || stripeLoading}
                  onClick={() => handleUpgrade(plan.plan_type)}
                >
                  {getButtonText(plan.plan_type)}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center mt-12 text-sm text-muted-foreground">
        <p>{language === 'fr' ? 'Tous les plans peuvent être annulés à tout moment' : 'All plans can be cancelled at any time'}</p>
        <p className="mt-2">
          {language === 'fr' 
            ? 'Des questions? Contactez-nous à support@gestionflow.com' 
            : 'Questions? Contact us at support@gestionflow.com'}
        </p>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onImmediateUpgrade={handleImmediateUpgrade}
        onScheduledUpgrade={handleScheduledUpgrade}
        subscriptionEnd={currentSubscription?.expires_at ?? null}
        language={language}
        price={availablePlans?.find(p => p.plan_type === 'pro')?.[billingCycle === 'monthly' ? 'monthly_price' : 'yearly_price'] ?? 0}
        billingCycle={billingCycle}
      />
    </div>
  );
};

export default Pricing;