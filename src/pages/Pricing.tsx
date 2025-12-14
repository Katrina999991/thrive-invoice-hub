import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Crown, TrendingUp, Zap, Settings, CreditCard, ArrowUp, ArrowDown, Info, Sparkles } from "lucide-react";
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
    const interval = setInterval(checkStatus, 60000);
    
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
      window.history.replaceState({}, '', window.location.pathname);
      checkSubscription();
    }
  }, [language]);

  const handleUpgrade = async (planType: string) => {
    const current = planLimits?.plan_type ?? 'free';

    if (planType === current) {
      toast.info(t.currentPlan);
      return;
    }

    const order = ['free', 'premium', 'pro'];
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(planType as any);

    // Upgrade (higher tier)
    if (targetIndex > currentIndex) {
      if (current === 'premium' && planType === 'pro') {
        setPendingUpgradePlan('pro');
        setShowUpgradeDialog(true);
        return;
      }
      
      await createCheckout(planType as 'premium' | 'pro', billingCycle);
      return;
    }

    // Downgrade -> open Customer Portal
    toast.info(
      language === 'fr'
        ? "Pour rétrograder, nous allons ouvrir le portail client Stripe."
        : "To downgrade, we will open the Stripe customer portal."
    );
    await openCustomerPortal();
  };

  const handleImmediateUpgrade = async () => {
    if (pendingUpgradePlan) {
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
      pageTitle: "Your Subscription",
      currentPlanLabel: "Current plan:",
      billingType: "Billing:",
      monthly: "Monthly",
      yearly: "Yearly",
      nextRenewal: "Next renewal:",
      manageSubscription: "Manage Subscription",
      saveYearly: "Save about 2 months",
      currentPlan: "Current Plan",
      upgradeTo: "Upgrade to",
      downgradeTo: "Downgrade to",
      perMonth: "/month",
      perYear: "/year",
      rulesTitle: "Plan Change Rules",
      upgradeRule: "When upgrading (Free → Premium, Premium → Pro):",
      upgradeEffect1: "The new plan takes effect immediately",
      upgradeEffect2: "The amount is prorated based on the remaining time in your billing cycle",
      downgradeRule: "When downgrading (Pro → Premium, Premium → Free):",
      downgradeEffect1: "Your current plan stays active until the end of the billing cycle",
      downgradeEffect2: "The new plan automatically applies at the next renewal",
      noCommitment: "No long-term commitment. You can change plans at any time.",
      securePayments: "All payments are processed securely via Stripe.",
      cancelAnytime: "Cancel or change your plan at any time.",
      freeUserTitle: "Unlock Your Full Potential",
      freeUserDesc: "Upgrade to Premium or Pro and enjoy unlimited invoices, PDF downloads, and advanced features.",
      plans: {
        free: {
          name: "Free",
          description: "Ideal to discover GestionFlow and start your business",
          features: [
            "1 company",
            "10 clients",
            "15 invoices per month",
            "10 expenses per month",
            "Email invoice sending",
            "1 invoice template (Classic - blue)",
            "Revenue report",
            "Stripe payments (2% fee)"
          ]
        },
        premium: {
          name: "Premium",
          description: "The best balance for freelancers and small businesses",
          popular: "Most Popular",
          chosenBy: "Chosen by most of our users",
          features: [
            "1 company",
            "Unlimited clients",
            "Unlimited invoices",
            "Unlimited expenses",
            "PDF invoice download",
            "2 invoice templates (Classic + Modern)",
            "Category management (products, services, expenses)",
            "Reports: revenue + taxes",
            "Stripe payments (1% fee)"
          ]
        },
        pro: {
          name: "Pro",
          description: "Full control for growing and multi-company businesses",
          features: [
            "Unlimited companies",
            "Unlimited clients",
            "Unlimited invoices",
            "Unlimited expenses",
            "All invoice templates",
            "All reports (revenue, taxes, clients, products, expenses, invoices)",
            "Full email customization",
            "Stripe payments (0.5% fee)"
          ]
        }
      }
    },
    fr: {
      pageTitle: "Votre abonnement",
      currentPlanLabel: "Plan actuel :",
      billingType: "Facturation :",
      monthly: "Mensuel",
      yearly: "Annuel",
      nextRenewal: "Prochain renouvellement :",
      manageSubscription: "Gérer mon abonnement",
      saveYearly: "Économisez environ 2 mois",
      currentPlan: "Plan actuel",
      upgradeTo: "Passer à",
      downgradeTo: "Rétrograder vers",
      perMonth: "/mois",
      perYear: "/an",
      rulesTitle: "Règles de changement de plan",
      upgradeRule: "Lors d'un upgrade (Gratuit → Premium, Premium → Pro) :",
      upgradeEffect1: "Le nouveau plan prend effet immédiatement",
      upgradeEffect2: "Le montant est ajusté au prorata en fonction du temps restant dans le cycle de facturation",
      downgradeRule: "Lors d'un downgrade (Pro → Premium, Premium → Gratuit) :",
      downgradeEffect1: "Le plan actuel reste actif jusqu'à la fin du cycle de facturation",
      downgradeEffect2: "Le nouveau plan s'applique automatiquement au prochain renouvellement",
      noCommitment: "Aucun engagement à long terme. Vous pouvez changer de plan à tout moment.",
      securePayments: "Tous les paiements sont traités de manière sécurisée via Stripe.",
      cancelAnytime: "Annulez ou changez de plan à tout moment.",
      freeUserTitle: "Débloquez tout votre potentiel",
      freeUserDesc: "Passez à Premium ou Pro et profitez de factures illimitées, du téléchargement PDF et de fonctionnalités avancées.",
      plans: {
        free: {
          name: "Gratuit",
          description: "Idéal pour découvrir GestionFlow et démarrer votre activité",
          features: [
            "1 entreprise",
            "10 clients",
            "15 factures par mois",
            "10 dépenses par mois",
            "Envoi de factures par courriel",
            "1 modèle de facture (Classique – bleu)",
            "Rapport de revenus",
            "Paiements Stripe (frais de 2 %)"
          ]
        },
        premium: {
          name: "Premium",
          description: "Le meilleur équilibre pour freelances et petites entreprises",
          popular: "Le plus populaire",
          chosenBy: "Choisi par la majorité de nos utilisateurs",
          features: [
            "1 entreprise",
            "Clients illimités",
            "Factures illimitées",
            "Dépenses illimitées",
            "Téléchargement PDF des factures",
            "2 modèles de factures (Classique + Moderne)",
            "Gestion des catégories (produits, services, dépenses)",
            "Rapports : revenus + taxes",
            "Paiements Stripe (frais de 1 %)"
          ]
        },
        pro: {
          name: "Pro",
          description: "Contrôle total pour entreprises en croissance et multi-entreprises",
          features: [
            "Entreprises illimitées",
            "Clients illimités",
            "Factures illimitées",
            "Dépenses illimitées",
            "Tous les modèles de factures",
            "Tous les rapports (revenus, taxes, clients, produits, dépenses, factures)",
            "Personnalisation complète des courriels",
            "Paiements Stripe (frais de 0,5 %)"
          ]
        }
      }
    }
  };

  const t = translations[language];

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Crown className="h-6 w-6 text-amber-500" />;
      case 'premium':
        return <TrendingUp className="h-6 w-6 text-primary" />;
      default:
        return <Zap className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPlanData = (planType: string) => {
    switch (planType) {
      case 'free':
        return t.plans.free;
      case 'premium':
        return t.plans.premium;
      case 'pro':
        return t.plans.pro;
      default:
        return t.plans.free;
    }
  };

  const getButtonConfig = (planType: string) => {
    const currentPlanType = planLimits?.plan_type ?? 'free';
    const isCurrent = currentPlanType === planType;
    
    if (isCurrent) {
      return { text: t.currentPlan, variant: 'outline' as const, disabled: true, icon: null };
    }

    const order = ['free', 'premium', 'pro'];
    const currentIndex = order.indexOf(currentPlanType);
    const targetIndex = order.indexOf(planType);

    if (targetIndex > currentIndex) {
      const planName = getPlanData(planType).name;
      return { 
        text: `${t.upgradeTo} ${planName}`, 
        variant: planType === 'premium' ? 'default' as const : 'secondary' as const, 
        disabled: false,
        icon: <ArrowUp className="h-4 w-4 mr-2" />
      };
    }

    const planName = getPlanData(planType).name;
    return { 
      text: `${t.downgradeTo} ${planName}`, 
      variant: 'outline' as const, 
      disabled: false,
      icon: <ArrowDown className="h-4 w-4 mr-2" />
    };
  };

  const isCurrentPlan = (planType: string) => {
    if (planLimits) return planLimits.plan_type === planType;
    if (planType === 'free' && !hasActiveStripeSubscription) return true;
    return false;
  };

  const getCurrentPlanName = () => {
    const currentType = planLimits?.plan_type ?? 'free';
    return getPlanData(currentType).name;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA');
  };

  const planOrder = ['free', 'premium', 'pro'];
  const orderedPlans = availablePlans?.sort((a, b) => 
    planOrder.indexOf(a.plan_type) - planOrder.indexOf(b.plan_type)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPlanType = planLimits?.plan_type ?? 'free';
  const isFreeUser = currentPlanType === 'free';

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t.pageTitle}</h1>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4 p-4 rounded-lg bg-muted/30 border">
          <div className="space-y-1">
            <p className="text-lg">
              <span className="text-muted-foreground">{t.currentPlanLabel}</span>{' '}
              <span className="font-semibold text-foreground">{getCurrentPlanName()}</span>
            </p>
            {hasActiveStripeSubscription && currentSubscription && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t.billingType} {currentSubscription.billing_cycle === 'yearly' ? t.yearly : t.monthly}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.nextRenewal} {formatDate(currentSubscription.expires_at)}
                </p>
              </>
            )}
          </div>
          
          {hasActiveStripeSubscription && (
            <Button 
              onClick={openCustomerPortal} 
              variant="outline" 
              disabled={stripeLoading}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {t.manageSubscription}
            </Button>
          )}
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-10 p-4 rounded-lg bg-muted/20">
        <Label 
          htmlFor="billing-toggle" 
          className={`text-base cursor-pointer transition-colors ${billingCycle === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
        >
          {t.monthly}
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <Label 
          htmlFor="billing-toggle" 
          className={`text-base cursor-pointer transition-colors ${billingCycle === 'yearly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
        >
          {t.yearly}
        </Label>
        {billingCycle === 'yearly' && (
          <Badge className="bg-primary/10 text-primary border-primary/20 ml-2">
            {t.saveYearly}
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
        {orderedPlans?.map((plan) => {
          const planData = getPlanData(plan.plan_type);
          const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
          const isCurrent = isCurrentPlan(plan.plan_type);
          const isPremium = plan.plan_type === 'premium';
          const buttonConfig = getButtonConfig(plan.plan_type);

          return (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col transition-all duration-300 ${
                isPremium 
                  ? 'border-primary shadow-lg md:scale-105 ring-2 ring-primary/20' 
                  : ''
              } ${isCurrent ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            >
              {/* Popular Badge for Premium */}
              {isPremium && 'popular' in planData && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-md">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {(planData as typeof t.plans.premium).popular}
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-3 right-4 z-10">
                  <Badge variant="secondary" className="bg-foreground text-background px-3 py-1">
                    {t.currentPlan}
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`pt-8 ${isPremium ? 'pt-10' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  {getPlanIcon(plan.plan_type)}
                  <h3 className="text-2xl font-bold text-foreground">{planData.name}</h3>
                </div>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">${price}</span>
                  <span className="text-muted-foreground text-lg">
                    {billingCycle === 'monthly' ? t.perMonth : t.perYear}
                  </span>
                  {billingCycle === 'yearly' && plan.plan_type !== 'free' && (
                    <p className="text-sm text-primary font-medium mt-1">{t.saveYearly}</p>
                  )}
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">{planData.description}</p>
                
                {isPremium && 'chosenBy' in planData && (
                  <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {(planData as typeof t.plans.premium).chosenBy}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {planData.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                <Button 
                  className="w-full" 
                  variant={buttonConfig.variant}
                  disabled={buttonConfig.disabled || stripeLoading}
                  onClick={() => handleUpgrade(plan.plan_type)}
                  size="lg"
                >
                  {buttonConfig.icon}
                  {plan.plan_type !== 'free' && !isCurrent && <CreditCard className="h-4 w-4 mr-2" />}
                  {buttonConfig.text}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Free User Incentive Section */}
      {isFreeUser && (
        <Alert className="mb-8 border-primary/30 bg-primary/5">
          <Sparkles className="h-5 w-5 text-primary" />
          <AlertDescription className="ml-2">
            <p className="font-semibold text-foreground">{t.freeUserTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.freeUserDesc}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Change Rules Section */}
      <Card className="mb-8 border-muted-foreground/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{t.rulesTitle}</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upgrade Rules */}
          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-green-500" />
              {t.upgradeRule}
            </p>
            <ul className="ml-6 space-y-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500">→</span>
                {t.upgradeEffect1}
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500">→</span>
                {t.upgradeEffect2}
              </li>
            </ul>
          </div>

          {/* Downgrade Rules */}
          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-amber-500" />
              {t.downgradeRule}
            </p>
            <ul className="ml-6 space-y-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-amber-500">→</span>
                {t.downgradeEffect1}
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-amber-500">→</span>
                {t.downgradeEffect2}
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground italic pt-2 border-t">
            {t.noCommitment}
          </p>
        </CardContent>
      </Card>

      {/* Trust Section */}
      <div className="text-center space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          <svg className="h-4" viewBox="0 0 60 25" fill="currentColor">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"/>
          </svg>
          {t.securePayments}
        </p>
        <p>{t.cancelAnytime}</p>
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
