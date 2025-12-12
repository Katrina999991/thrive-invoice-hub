import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Crown, TrendingUp, Zap, Settings, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      // Pass true as third parameter to indicate this is an upgrade with proration
      await createCheckout(pendingUpgradePlan, billingCycle, true);
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
        invoicePdfExport: "Invoice PDF Download",
        emailBasic: "Email invoice sending",
        revenueReport: "Revenue Report",
        invoiceTemplate: "invoice template",
        invoiceTemplates: "invoice templates",
        categoryManagement: "Product & expense categories",
        taxReport: "Tax Report",
        allReports: "All reports (Revenue, Taxes, Clients, Products, Expenses, Invoices)",
        customEmails: "Custom email templates",
        unlimited: "Unlimited",
        stripeFee: "platform fee on Stripe payments",
      },
      planDescriptions: {
        free: "Get started for free",
        premium: "The smart choice for small businesses",
        pro: "For agencies and multi-company operations",
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
        invoicePdfExport: "Téléchargement PDF des factures",
        emailBasic: "Envoi de factures par courriel",
        revenueReport: "Rapport de revenus",
        invoiceTemplate: "modèle de facture",
        invoiceTemplates: "modèles de factures",
        categoryManagement: "Catégories produits & dépenses",
        taxReport: "Rapport des taxes",
        allReports: "Tous les rapports (Revenus, Taxes, Clients, Produits, Dépenses, Factures)",
        customEmails: "Personnalisation des courriels",
        unlimited: "Illimité",
        stripeFee: "de frais sur paiements Stripe",
      },
      planDescriptions: {
        free: "Commencez gratuitement",
        premium: "Le choix idéal pour petites entreprises",
        pro: "Pour agences et gestion multi-entreprises",
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

    // FREE PLAN - Entry level
    if (plan.plan_type === 'free') {
      features.push({ text: `1 ${t.features.company}`, included: true });
      features.push({ text: `10 ${t.features.clients}`, included: true });
      features.push({ text: `15 ${t.features.invoices}`, included: true });
      features.push({ text: `10 ${t.features.expenses}`, included: true });
      features.push({ text: t.features.emailBasic, included: true });
      features.push({ text: `1 ${t.features.invoiceTemplate} (Classic)`, included: true });
      features.push({ text: t.features.revenueReport, included: true });
      features.push({ text: `2% ${t.features.stripeFee}`, included: true });
    }

    // PREMIUM PLAN - Value features first, then limits
    if (plan.plan_type === 'premium') {
      // Value propositions first
      features.push({ text: `1% ${t.features.stripeFee}`, included: true });
      features.push({ text: t.features.invoicePdfExport, included: true });
      features.push({ text: `+1 ${t.features.invoiceTemplate} (Modern)`, included: true });
      features.push({ text: t.features.categoryManagement, included: true });
      features.push({ 
        text: language === 'fr' 
          ? 'Rapports : Revenus + Taxes' 
          : 'Reports: Revenue + Tax', 
        included: true 
      });
      // Then limits
      features.push({ text: `1 ${t.features.company}`, included: true });
      features.push({ text: `50 ${t.features.clients}`, included: true });
      features.push({ text: `100 ${t.features.invoices}`, included: true });
      features.push({ 
        text: language === 'fr' 
          ? 'Dépenses illimitées' 
          : 'Unlimited expenses', 
        included: true 
      });
    }

    // PRO PLAN - Advanced features
    if (plan.plan_type === 'pro') {
      // Value propositions first
      features.push({ text: `0.5% ${t.features.stripeFee}`, included: true });
      features.push({ text: t.features.invoicePdfExport, included: true });
      features.push({ 
        text: language === 'fr' 
          ? 'Tous les modèles de factures' 
          : 'All invoice templates', 
        included: true 
      });
      features.push({ text: t.features.categoryManagement, included: true });
      features.push({ text: t.features.allReports, included: true });
      features.push({ text: t.features.customEmails, included: true });
      // Then unlimited everything
      features.push({ 
        text: language === 'fr' 
          ? 'Entreprises illimitées' 
          : 'Unlimited companies', 
        included: true 
      });
      features.push({ 
        text: language === 'fr' 
          ? 'Clients illimités' 
          : 'Unlimited clients', 
        included: true 
      });
      features.push({ 
        text: language === 'fr' 
          ? 'Factures illimitées' 
          : 'Unlimited invoices', 
        included: true 
      });
      features.push({ 
        text: language === 'fr' 
          ? 'Dépenses illimitées' 
          : 'Unlimited expenses', 
        included: true 
      });
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
          const isPremium = plan.plan_type === 'premium';

          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPremium ? 'border-primary shadow-lg scale-105' : ''} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
            >
              {isPremium && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1">
                    {language === 'fr' ? 'Recommandé' : 'Recommended'}
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

              <CardFooter className="flex-col gap-3">
                {plan.plan_type === 'free' ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.plan_type)}
                  >
                    {getButtonText(plan.plan_type)}
                  </Button>
                ) : (
                  <>
                    <Button 
                      className="w-full" 
                      variant={isCurrent ? 'outline' : (isPremium ? 'default' : 'secondary')}
                      disabled={isCurrent || stripeLoading}
                      onClick={() => handleUpgrade(plan.plan_type)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {getButtonText(plan.plan_type)}
                    </Button>
                    {!isCurrent && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <span>{language === 'fr' ? 'Paiement sécurisé par' : 'Secure payment by'}</span>
                        <svg className="h-4" viewBox="0 0 60 25" fill="currentColor">
                          <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"/>
                        </svg>
                      </div>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Stripe Fee Info */}
      <Alert className="mt-8 max-w-4xl mx-auto border-amber-200 bg-amber-50 dark:bg-amber-950/50">
        <AlertDescription className="text-sm">
          {language === 'fr' 
            ? '💡 Frais de plateforme dégressifs sur les paiements Stripe : Gratuit 2% • Premium 1% • Pro 0,5%' 
            : '💡 Decreasing platform fees on Stripe payments: Free 2% • Premium 1% • Pro 0.5%'}
        </AlertDescription>
      </Alert>

      {/* Additional Info */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>{language === 'fr' ? 'Tous les plans peuvent être annulés à tout moment' : 'All plans can be cancelled at any time'}</p>
        <p className="mt-2">
          {language === 'fr' 
            ? 'Des questions? Contactez-nous à support@gestionflow.com' 
            : 'Questions? Contact us at support@gestionflow.com'}
        </p>
      </div>

      {/* Downgrade Policy Info */}
      <Card className="mt-8 max-w-4xl mx-auto border-muted-foreground/20 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'Politique de changement de plan' : 'Plan Downgrade Policy'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {language === 'fr' 
              ? "Si vous passez à un plan inférieur (par exemple de Pro à Premium), voici ce qui se passe :"
              : "If you downgrade to a lower plan (e.g., from Pro to Premium), here's what happens:"}
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {language === 'fr'
                  ? "Vous conservez toutes vos données existantes (entreprises, clients, factures, dépenses)"
                  : "You keep all your existing data (companies, clients, invoices, expenses)"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {language === 'fr'
                  ? "Vous pouvez consulter, modifier et supprimer toutes vos données"
                  : "You can view, edit, and delete all your data"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {language === 'fr'
                  ? "Cependant, vous ne pourrez pas créer de nouvelles entités si vous dépassez les limites du nouveau plan"
                  : "However, you cannot create new entities if you exceed your new plan's limits"}
              </span>
            </li>
          </ul>
          <p className="pt-2 text-muted-foreground italic">
            {language === 'fr'
              ? "Exemple : Si vous avez 3 entreprises sur le plan Pro et que vous passez au plan Premium (limite : 1 entreprise), vous gardez vos 3 entreprises mais vous devrez en supprimer 2 avant de pouvoir en créer une nouvelle."
              : "Example: If you have 3 companies on Pro plan and downgrade to Premium (limit: 1 company), you keep all 3 companies but must delete 2 before you can create a new one."}
          </p>
        </CardContent>
      </Card>

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