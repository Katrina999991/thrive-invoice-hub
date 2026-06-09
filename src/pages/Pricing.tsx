import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrencyLocale } from "@/hooks/useCurrencyLocale";
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  Settings, 
  CreditCard, 
  ArrowUp, 
  ArrowDown, 
  Info, 
  Sparkles,
  Lock,
  Building2,
  Users,
  FileText,
  Receipt,
  Mail,
  BarChart3,
  ArrowRight,
  RefreshCcw,
  BadgePercent,
  HelpCircle,
  Clock,
  Shield,
  Tags,
  Package,
  Palette,
  History,
  UsersRound,
  FileCheck,
  X,
  Globe,
  FileX
} from "lucide-react";
import { useState, useEffect } from "react";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const { availablePlans, currentSubscription, isLoading, planLimits } = useSubscription();
  const { language } = useLanguage();
  const { formatPrice, isLocalCurrency, currency, currencyNote } = useCurrencyLocale();
  const { createCheckout, checkSubscription, openCustomerPortal, scheduleUpgrade, isLoading: stripeLoading } = useStripeCheckout();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hasActiveStripeSubscription, setHasActiveStripeSubscription] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<'premium' | 'pro' | null>(null);

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

    if (targetIndex > currentIndex) {
      if (current === 'premium' && planType === 'pro') {
        setPendingUpgradePlan('pro');
        setShowUpgradeDialog(true);
        return;
      }
      
      await createCheckout(planType as 'premium' | 'pro', billingCycle);
      return;
    }

    // Check if user has an active paid plan (from Supabase) before trying to open portal
    const currentPlanType = planLimits?.plan_type;
    if (!currentPlanType || currentPlanType === 'free') {
      toast.info(
        language === 'fr'
          ? "Vous êtes déjà sur le plan gratuit."
          : "You are already on the free plan."
      );
      return;
    }

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
      nextRenewal: "Next billing date:",
      manageSubscription: "Manage Subscription",
      saveYearly: "Save about 2 months with annual billing",
      saveYearlyShort: "Save ~2 months",
      currentPlan: "Your Plan",
      upgradeTo: "Upgrade to",
      switchToFree: "Switch to Free",
      perMonth: "/month",
      perYear: "/year",
      billingRulesTitle: "Billing Rules",
      billingRule1: "Upgrades take effect immediately.",
      billingRule2: "Charges are prorated automatically.",
      billingRule3: "Downgrades take effect at the end of the current billing cycle.",
      billingRule4: "Switching to the Free plan acts as subscription cancellation.",
      noCommitment: "No long-term commitment. You can change plans at any time.",
      securePayments: "Secure payments via Stripe",
      cancelAnytime: "Cancel anytime, no questions asked",
      policyTitle: "Plan Change Policy",
      policyIntro: "If you downgrade to a lower plan (e.g., from Pro to Premium), here's what happens:",
      policyKeepData: "You keep all your existing data (companies, clients, invoices, expenses)",
      policyViewEdit: "You can view, edit, and delete all your data",
      policyNoCreate: "However, you won't be able to create new entities if you exceed the new plan's limits",
      policyExample: "Example: If you have 3 companies on the Pro plan and downgrade to Premium (limit: 1 company), you keep your 3 companies but will need to delete 2 before you can create a new one.",
      freeUserTitle: "Unlock Your Full Potential",
      freeUserDesc: "Upgrade to Premium or Pro for unlimited invoicing, PDF exports, and reduced payment processing costs.",
      pricingDisclaimer: "Prices shown in your local currency. Base pricing in CAD. Taxes may apply.",
      plans: {
        free: {
          name: "Free",
          description: "Discover and test GestionFlow",
          stripeInfo: "+2% GestionFlow fee per payment",
          stripeInfoShort: "+2% GestionFlow fee",
          stripeFeeNote: "Stripe fees apply",
          noInventory: "Inventory management not included",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 invoices / month", icon: "FileText" },
            { text: "Quotes included", icon: "FileCheck" },
            { text: "PDF invoices & quotes (GestionFlow branding)", icon: "FileText" },
            { text: "Classic design", icon: "Palette" },
            { text: "Revenue report", icon: "BarChart3" },
            { text: "Time tracking", icon: "Clock" },
            { text: "Product, service & expense categories", icon: "Tags" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        },
        premium: {
          name: "Premium",
          description: "Best for freelancers and small businesses",
          popular: "Most Popular",
          chosenBy: "Chosen by most of our users",
          stripeInfo: "0% GestionFlow fees 🎉",
          stripeInfoShort: "0% GestionFlow fees",
          stripeFeeNote: "Stripe fees apply",
          stripeBadge: "Stop paying fees on every invoice",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices & quotes", icon: "FileText" },
            { text: "Unlimited expenses", icon: "Receipt" },
            { text: "PDF invoices & quotes", icon: "FileText" },
            { text: "Classic + Modern designs", icon: "Palette" },
            { text: "Saved invoice & quote body messages", icon: "Mail" },
            { text: "Product, service & expense categories", icon: "Tags" },
            { text: "Inventory management", icon: "Package" },
            { text: "Automatic stock updates on sales", icon: "RefreshCcw" },
            { text: "Tax reports", icon: "BarChart3" },
            { text: "Expense reports", icon: "Receipt" },
            { text: "CSV export (expense & revenue reports)", icon: "FileSpreadsheet" },
            { text: "Time tracking", icon: "Clock" },
            { text: "Final payment reminder", icon: "Mail" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        },
        pro: {
          name: "Pro",
          description: "Ideal for growing businesses and multi-company management",
          stripeInfo: "0% GestionFlow fees",
          stripeInfoShort: "0% GestionFlow fees",
          stripeFeeNote: "Stripe fees apply",
          features: [
            { text: "Unlimited companies", icon: "Building2" },
            { text: "Unlimited clients, invoices & quotes", icon: "Users" },
            { text: "All invoice & quote designs", icon: "Palette" },
            { text: "Advanced document customization", icon: "FileText" },
            { text: "Full access to all reports", icon: "BarChart3" },
            { text: "Audit logs (unlimited history)", icon: "History" },
            { text: "Final payment reminder", icon: "Mail" },
            { text: "Formal notice", icon: "FileX" },
            { text: "Priority support", icon: "UsersRound" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        }
      },
      stripeFeesTitle: "Payment Processing",
      stripeFeesDesc: "Accept payments securely via Stripe.",
      stripeFeesDesc2: "Standard Stripe fees (~2.9% + $0.30) apply to all plans.",
      stripeFeesDesc3: "GestionFlow fees by plan:",
      stripeFeesFree: "Free: +2% GestionFlow fee",
      stripeFeesPremium: "Premium: 0% GestionFlow fees",
      stripeFeesPro: "Pro: 0% GestionFlow fees",
      switchToFreeWarning: "Switching to the Free plan will disable paid features at the end of your billing cycle."
    },
    fr: {
      pageTitle: "Votre abonnement",
      currentPlanLabel: "Plan actuel :",
      billingType: "Facturation :",
      monthly: "Mensuel",
      yearly: "Annuel",
      nextRenewal: "Prochaine date de facturation :",
      manageSubscription: "Gérer mon abonnement",
      saveYearly: "Économisez environ 2 mois avec la facturation annuelle",
      saveYearlyShort: "Économisez ~2 mois",
      currentPlan: "Votre plan",
      upgradeTo: "Passer à",
      switchToFree: "Passer au Gratuit",
      perMonth: "/mois",
      perYear: "/an",
      billingRulesTitle: "Règles de facturation",
      billingRule1: "Les upgrades prennent effet immédiatement.",
      billingRule2: "Les frais sont ajustés au prorata automatiquement.",
      billingRule3: "Les downgrades prennent effet à la fin du cycle de facturation actuel.",
      billingRule4: "Passer au plan Gratuit équivaut à une annulation d'abonnement.",
      noCommitment: "Aucun engagement à long terme. Vous pouvez changer de plan à tout moment.",
      securePayments: "Paiements sécurisés via Stripe",
      cancelAnytime: "Annulez à tout moment, sans justification",
      policyTitle: "Politique de changement de plan",
      policyIntro: "Si vous passez à un plan inférieur (par exemple de Pro à Premium), voici ce qui se passe :",
      policyKeepData: "Vous conservez toutes vos données existantes (entreprises, clients, factures, dépenses)",
      policyViewEdit: "Vous pouvez consulter, modifier et supprimer toutes vos données",
      policyNoCreate: "Cependant, vous ne pourrez pas créer de nouvelles entités si vous dépassez les limites du nouveau plan",
      policyExample: "Exemple : Si vous avez 3 entreprises sur le plan Pro et que vous passez au plan Premium (limite : 1 entreprise), vous gardez vos 3 entreprises mais vous devrez en supprimer 2 avant de pouvoir en créer une nouvelle.",
      freeUserTitle: "Débloquez tout votre potentiel",
      freeUserDesc: "Passez à Premium ou Pro pour la facturation illimitée, l'export PDF et des frais de paiement réduits.",
      pricingDisclaimer: "Prix affichés dans votre devise locale. Tarification de base en CAD. Les taxes peuvent s'appliquer.",
      plans: {
        free: {
          name: "Gratuit",
          description: "Découvrez et testez GestionFlow",
          stripeInfo: "+2 % frais GestionFlow par paiement",
          stripeInfoShort: "+2 % frais GestionFlow",
          stripeFeeNote: "Les frais Stripe s'appliquent",
          noInventory: "Gestion des stocks non incluse",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 factures / mois", icon: "FileText" },
            { text: "Devis inclus", icon: "FileCheck" },
            { text: "Factures et devis PDF (avec signature GestionFlow)", icon: "FileText" },
            { text: "Design classique", icon: "Palette" },
            { text: "Rapport de revenus", icon: "BarChart3" },
            { text: "Suivi des heures", icon: "Clock" },
            { text: "Catégories (produits, services, dépenses)", icon: "Tags" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        },
        premium: {
          name: "Premium",
          description: "Idéal pour freelances et petites entreprises",
          popular: "Le plus populaire",
          chosenBy: "Choisi par la majorité de nos utilisateurs",
          stripeInfo: "0 % frais GestionFlow 🎉",
          stripeInfoShort: "0 % frais GestionFlow",
          stripeFeeNote: "Les frais Stripe s'appliquent",
          stripeBadge: "Arrêtez de payer des frais sur chaque facture",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures et devis illimités", icon: "FileText" },
            { text: "Dépenses illimitées", icon: "Receipt" },
            { text: "Factures et devis PDF", icon: "FileText" },
            { text: "Designs classique + moderne", icon: "Palette" },
            { text: "Messages de facture et devis personnalisés", icon: "Mail" },
            { text: "Catégories (produits, services, dépenses)", icon: "Tags" },
            { text: "Gestion des stocks", icon: "Package" },
            { text: "Mise à jour automatique des stocks sur ventes", icon: "RefreshCcw" },
            { text: "Rapports fiscaux", icon: "BarChart3" },
            { text: "Rapports de dépenses", icon: "Receipt" },
            { text: "Export CSV (rapports dépenses et revenus)", icon: "FileSpreadsheet" },
            { text: "Suivi des heures", icon: "Clock" },
            { text: "Dernier rappel de paiement", icon: "Mail" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        },
        pro: {
          name: "Pro",
          description: "Parfait pour entreprises en croissance et gestion multi-entreprises",
          stripeInfo: "0 % frais GestionFlow",
          stripeInfoShort: "0 % frais GestionFlow",
          stripeFeeNote: "Les frais Stripe s'appliquent",
          features: [
            { text: "Entreprises illimitées", icon: "Building2" },
            { text: "Clients, factures et devis illimités", icon: "Users" },
            { text: "Tous les designs de factures et devis", icon: "Palette" },
            { text: "Personnalisation avancée des documents", icon: "FileText" },
            { text: "Accès complet à tous les rapports", icon: "BarChart3" },
            { text: "Audit logs (historique illimité)", icon: "History" },
            { text: "Dernier rappel de paiement", icon: "Mail" },
            { text: "Mise en demeure", icon: "FileX" },
            { text: "Support prioritaire", icon: "UsersRound" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        }
      },
      stripeFeesTitle: "Traitement des paiements",
      stripeFeesDesc: "Acceptez les paiements de manière sécurisée via Stripe.",
      stripeFeesDesc2: "Les frais standard de Stripe (~2,9 % + 0,30 $) s'appliquent à tous les plans.",
      stripeFeesDesc3: "Frais GestionFlow selon votre plan :",
      stripeFeesFree: "Gratuit : +2 % frais GestionFlow",
      stripeFeesPremium: "Premium : 0 % frais GestionFlow",
      stripeFeesPro: "Pro : 0 % frais GestionFlow",
      switchToFreeWarning: "Passer au plan Gratuit désactivera les fonctionnalités payantes à la fin de votre cycle de facturation."
    }
  };

  const t = translations[language];

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Star className="h-6 w-6" />;
      case 'premium':
        return <Crown className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getFeatureIcon = (iconName: string) => {
    const iconClass = "h-4 w-4 text-primary shrink-0";
    switch (iconName) {
      case 'Building2': return <Building2 className={iconClass} />;
      case 'Users': return <Users className={iconClass} />;
      case 'FileText': return <FileText className={iconClass} />;
      case 'Receipt': return <Receipt className={iconClass} />;
      case 'Mail': return <Mail className={iconClass} />;
      case 'BarChart3': return <BarChart3 className={iconClass} />;
      case 'Clock': return <Clock className={iconClass} />;
      case 'Shield': return <Shield className={iconClass} />;
      case 'Tags': return <Tags className={iconClass} />;
      case 'Package': return <Package className={iconClass} />;
      case 'RefreshCcw': return <RefreshCcw className={iconClass} />;
      case 'CreditCard': return <CreditCard className={iconClass} />;
      case 'Palette': return <Palette className={iconClass} />;
      case 'History': return <History className={iconClass} />;
      case 'UsersRound': return <UsersRound className={iconClass} />;
      case 'FileCheck': return <FileCheck className={iconClass} />;
      case 'FileX': return <FileX className={iconClass} />;
      default: return <Check className={iconClass} />;
    }
  };

  const getCurrentPlanStripeInfo = () => {
    const currentType = planLimits?.plan_type ?? 'free';
    const planData = getPlanData(currentType);
    return 'stripeInfoShort' in planData ? (planData as any).stripeInfoShort : '';
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
      return { text: t.currentPlan, variant: 'outline' as const, disabled: true, icon: null, isUpgrade: false };
    }

    const order = ['free', 'premium', 'pro'];
    const currentIndex = order.indexOf(currentPlanType);
    const targetIndex = order.indexOf(planType);

    if (targetIndex > currentIndex) {
      const planName = getPlanData(planType).name;
      return { 
        text: `${t.upgradeTo} ${planName}`, 
        variant: 'default' as const, 
        disabled: false,
        icon: <ArrowUp className="h-4 w-4 mr-2" />,
        isUpgrade: true
      };
    }

    // For Free plan, use "Switch to Free" instead of "Downgrade to Free"
    if (planType === 'free') {
      return { 
        text: t.switchToFree, 
        variant: 'outline' as const, 
        disabled: false,
        icon: <ArrowDown className="h-4 w-4 mr-2" />,
        isUpgrade: false
      };
    }

    const planName = getPlanData(planType).name;
    return { 
      text: `${t.upgradeTo} ${planName}`, 
      variant: 'outline' as const, 
      disabled: false,
      icon: <ArrowDown className="h-4 w-4 mr-2" />,
      isUpgrade: false
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
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4 p-5 rounded-xl bg-muted/30 border">
          <div className="space-y-2">
            <p className="text-lg">
              <span className="text-muted-foreground">{t.currentPlanLabel}</span>{' '}
              <Badge className="ml-2 bg-primary text-primary-foreground px-3 py-1">
                {getCurrentPlanName()}
              </Badge>
            </p>
            {hasActiveStripeSubscription && currentSubscription && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  {t.billingType} {currentSubscription.billing_cycle === 'yearly' ? t.yearly : t.monthly}
                </span>
                <span className="flex items-center gap-1">
                  📅 {t.nextRenewal} {formatDate(currentSubscription.expires_at)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>
                {language === 'fr' ? 'Paiements Stripe : frais standard Stripe' : 'Stripe payments: standard Stripe fees'} {getCurrentPlanStripeInfo()}
              </span>
            </div>
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
      <div className="flex flex-col items-center justify-center gap-3 mb-10">
        <div className="inline-flex items-center gap-1 p-1.5 bg-muted rounded-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`py-3 px-6 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-background text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`py-3 px-6 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-background text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.yearly}
          </button>
        </div>
        {billingCycle === 'yearly' && (
          <p className="text-sm text-primary font-medium animate-in fade-in slide-in-from-top-2">
            ✨ {t.saveYearly}
          </p>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 lg:gap-10 mb-10 items-stretch">
        {orderedPlans?.map((plan) => {
          const planData = getPlanData(plan.plan_type);
          const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
          const isCurrent = isCurrentPlan(plan.plan_type);
          const isPremium = plan.plan_type === 'premium';
          const isPro = plan.plan_type === 'pro';
          const buttonConfig = getButtonConfig(plan.plan_type);

          return (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col transition-all duration-300 ${
                isPremium 
                  ? 'border-2 border-primary shadow-xl md:scale-[1.02] ring-2 ring-primary/5' 
                  : 'border-border hover:border-primary/20 hover:shadow-md'
              } ${isCurrent ? 'ring-2 ring-primary/50 bg-primary/[0.02]' : ''}`}
            >
              {/* Popular Badge for Premium - Modernized */}
              {isPremium && 'popular' in planData && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold shadow-sm whitespace-nowrap rounded-full">
                    <Star className="h-3 w-3 mr-1.5 fill-current" />
                    {(planData as typeof t.plans.premium).popular}
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge - Refined */}
              {isCurrent && (
                <div className="absolute -top-2.5 right-4 z-10">
                  <Badge variant="outline" className="bg-background border-primary/30 text-primary px-3 py-1 text-xs font-medium shadow-sm">
                    <Check className="h-3 w-3 mr-1" />
                    {t.currentPlan}
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`pt-8 pb-4 ${isPremium ? 'pt-10' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    isPremium ? 'bg-primary/10 text-primary' : 
                    isPro ? 'bg-amber-500/10 text-amber-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {getPlanIcon(plan.plan_type)}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{planData.name}</h3>
                </div>
                
                {/* Price Display - Localized */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground tracking-tight">
                      {formatPrice(price)}
                    </span>
                    <span className="text-muted-foreground text-base">
                      {billingCycle === 'monthly' ? t.perMonth : t.perYear}
                    </span>
                  </div>
                  {isLocalCurrency && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {language === 'fr' ? `≈ ${price.toFixed(2)} $ CAD` : `≈ ${price.toFixed(2)} CAD`}
                    </p>
                  )}
                </div>

                {isPremium && 'chosenBy' in planData && (
                  <p className="text-xs text-primary/80 font-medium mb-2">
                    {(planData as typeof t.plans.premium).chosenBy}
                  </p>
                )}

                {billingCycle === 'yearly' && plan.plan_type !== 'free' && (
                  <p className="text-xs text-primary font-medium mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t.saveYearlyShort}
                  </p>
                )}
                
                <p className="text-muted-foreground text-sm leading-relaxed">{planData.description}</p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col pt-0">
                <ul className="space-y-2.5 flex-1">
                  {planData.features.map((feature: { text: string; icon: string }, index: number) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="mt-0.5">{getFeatureIcon(feature.icon)}</span>
                      <span className="text-sm text-foreground leading-snug">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {/* No Inventory for Free Plan */}
                {plan.plan_type === 'free' && 'noInventory' in planData && (
                  <div className="mt-3 flex items-start gap-2.5 text-muted-foreground">
                    <X className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="text-sm leading-snug">{(planData as any).noInventory}</span>
                  </div>
                )}
                
                {/* Stripe Info - Benefit-focused */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className={`flex items-center gap-2 ${isPremium || isPro ? 'text-primary' : 'text-muted-foreground'}`}>
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{planData.stripeInfo}</span>
                  </div>
                  {'stripeFeeNote' in planData && (
                    <p className="text-xs text-muted-foreground mt-1.5 ml-6">
                      {(planData as any).stripeFeeNote}
                    </p>
                  )}
                  {'stripeBadge' in planData && (
                    <p className="text-xs font-semibold text-primary mt-2 ml-6 bg-primary/10 rounded-full px-3 py-1 inline-block">
                      {(planData as any).stripeBadge}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-6 flex-col gap-3">
                <Button 
                  className={`w-full h-11 font-medium transition-all ${
                    buttonConfig.isUpgrade && isPremium 
                      ? 'text-base shadow-md hover:shadow-lg' 
                      : ''
                  }`}
                  variant={buttonConfig.variant}
                  disabled={buttonConfig.disabled || stripeLoading}
                  onClick={() => handleUpgrade(plan.plan_type)}
                  size="lg"
                >
                  {buttonConfig.icon}
                  {buttonConfig.text}
                  {buttonConfig.isUpgrade && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
                {plan.plan_type === 'free' && planLimits?.plan_type !== 'free' && (
                  <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[90%] mx-auto">
                    {language === 'fr' 
                      ? 'Passer au plan Gratuit met fin à votre abonnement à la fin de votre période de facturation.'
                      : 'Switching to Free ends your subscription at the end of your billing period.'}
                  </p>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Pricing Disclaimer */}
      <p className="text-center text-xs text-muted-foreground mb-10 flex items-center justify-center gap-1.5">
        <Globe className="h-3.5 w-3.5" />
        {currencyNote[language]}
      </p>

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

      {/* Billing Rules Section */}
      <Card className="mb-8 border-muted-foreground/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{t.billingRulesTitle}</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {t.billingRule1}
            </li>
            <li className="flex items-start gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {t.billingRule2}
            </li>
            <li className="flex items-start gap-2 text-sm text-foreground">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              {t.billingRule3}
            </li>
            <li className="flex items-start gap-2 text-sm text-foreground">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              {t.billingRule4}
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Plan Change Policy Section */}
      <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-foreground">{t.policyTitle}</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground font-medium">{t.policyIntro}</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {t.policyKeepData}
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {t.policyViewEdit}
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              {t.policyNoCreate}
            </li>
          </ul>
          <div className="p-3 rounded-lg bg-muted/50 border border-muted-foreground/10">
            <p className="text-sm text-muted-foreground italic">{t.policyExample}</p>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Payments & Fees Section */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{t.stripeFeesTitle}</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.stripeFeesDesc}</p>
            <p className="text-sm text-muted-foreground">{t.stripeFeesDesc2}</p>
            <p className="text-sm text-muted-foreground">{t.stripeFeesDesc3}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-muted-foreground/10 text-center">
              <p className="text-sm font-medium text-foreground">{t.stripeFeesFree}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm font-medium text-primary">{t.stripeFeesPremium}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm font-medium text-primary">{t.stripeFeesPro}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {language === 'fr' ? 'Questions fréquentes sur votre abonnement' : 'Frequently Asked Questions About Your Subscription'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'fr' ? 'Tout ce que vous devez savoir pour gérer votre plan' : 'Everything you need to know to manage your plan'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["faq-1", "faq-2", "faq-7"]} className="w-full">
            {/* Question 1 - Highlighted: Upgrade/Downgrade */}
            <AccordionItem value="faq-1" className="border-l-4 border-l-primary pl-4">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">
                    {language === 'fr' ? 'Quand un changement de plan prend-il effet ?' : 'When does a plan change take effect?'}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pl-6">
                {language === 'fr' 
                  ? "Lors d'un upgrade, le nouveau plan prend effet immédiatement. Lors d'un downgrade, votre plan actuel reste actif jusqu'à la fin du cycle de facturation."
                  : "When upgrading, the new plan takes effect immediately. When downgrading, your current plan stays active until the end of the billing cycle."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 2 - Highlighted: Prorata */}
            <AccordionItem value="faq-2" className="border-l-4 border-l-primary pl-4">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">
                    {language === 'fr' ? "Comment fonctionne l'ajustement au prorata ?" : 'How does proration work?'}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pl-6">
                {language === 'fr'
                  ? "Lorsque vous passez à un plan supérieur, le montant déjà payé est pris en compte et seul le solde correspondant au temps restant est facturé."
                  : "When upgrading, the amount already paid is taken into account and only the balance for the remaining time is charged."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 3 - NEW: Stop subscription */}
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Comment puis-je arrêter mon abonnement payant ?' : 'How can I stop my paid subscription?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Pour arrêter votre abonnement payant, il suffit de passer au plan Gratuit depuis la page Abonnement. Votre plan actuel restera actif jusqu'à la fin de votre période de facturation, puis la facturation s'arrêtera automatiquement. Aucun engagement à long terme n'est requis."
                  : "To stop your paid subscription, simply switch to the Free plan from the Subscription page. Your current plan will remain active until the end of your billing period, then billing will stop automatically. No long-term commitment is required."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 4 */}
            <AccordionItem value="faq-4">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Puis-je changer de plan plusieurs fois ?' : 'Can I change plans multiple times?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Oui. Vous pouvez changer de plan à tout moment depuis cette page, sans engagement à long terme."
                  : "Yes. You can change plans at any time from this page, with no long-term commitment."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 5 */}
            <AccordionItem value="faq-5">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Que se passe-t-il si je downgrade mon plan ?' : 'What happens if I downgrade my plan?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Vous conservez toutes les fonctionnalités de votre plan actuel jusqu'à la fin de votre période de facturation. Le nouveau plan sera appliqué automatiquement au prochain renouvellement."
                  : "You keep all features of your current plan until the end of your billing period. The new plan will be applied automatically at the next renewal."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 6 */}
            <AccordionItem value="faq-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Mes données seront-elles perdues si je downgrade ?' : 'Will my data be lost if I downgrade?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Non. Toutes vos données sont conservées. Certaines fonctionnalités peuvent toutefois devenir indisponibles selon le plan actif."
                  : "No. All your data is preserved. Some features may become unavailable depending on the active plan."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 7 - Highlighted: Stripe Payments */}
            <AccordionItem value="faq-7" className="border-l-4 border-l-primary pl-4">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">
                    {language === 'fr' ? 'Comment fonctionnent les paiements Stripe et les frais ?' : 'How do Stripe payments and fees work?'}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pl-6">
                {language === 'fr'
                  ? "Les paiements sont traités de manière sécurisée via Stripe. Les frais standard de Stripe (~2,9 % + 0,30 $) s'appliquent à tous les plans. GestionFlow ajoute des frais selon votre plan : Gratuit +2 %, Premium 0 %, Pro 0 %."
                  : "Payments are processed securely via Stripe. Standard Stripe fees (~2.9% + $0.30) apply to all plans. GestionFlow adds a fee based on your plan: Free +2%, Premium 0%, Pro 0%."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 8 */}
            <AccordionItem value="faq-8">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Pourquoi les frais GestionFlow diminuent-ils selon le plan ?' : 'Why do GestionFlow fees decrease based on the plan?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Les plans Premium et Pro offrent 0 % de frais GestionFlow. Le plan Gratuit applique 2 % de frais GestionFlow par paiement. Les frais standard de Stripe s'appliquent toujours à tous les plans."
                  : "Premium and Pro plans enjoy 0% GestionFlow fees. The Free plan applies a 2% GestionFlow fee per payment. Standard Stripe fees always apply to all plans."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 9 */}
            <AccordionItem value="faq-9">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Puis-je passer directement du plan Gratuit au plan Pro ?' : 'Can I upgrade directly from Free to Pro?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Oui. Vous pouvez passer directement au plan Pro à tout moment."
                  : "Yes. You can upgrade directly to the Pro plan at any time."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 10 */}
            <AccordionItem value="faq-10">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Puis-je revenir à un plan inférieur plus tard ?' : 'Can I downgrade to a lower plan later?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Oui. Vous pouvez downgrade votre plan à tout moment. Le changement prendra effet à la fin de votre cycle de facturation."
                  : "Yes. You can downgrade your plan at any time. The change will take effect at the end of your billing cycle."}
              </AccordionContent>
            </AccordionItem>

            {/* Question 11 */}
            <AccordionItem value="faq-11">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium">
                  {language === 'fr' ? 'Comment puis-je annuler mon abonnement ?' : 'How can I cancel my subscription?'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {language === 'fr'
                  ? "Vous pouvez annuler votre abonnement à tout moment depuis cette page. Aucun engagement à long terme n'est requis."
                  : "You can cancel your subscription at any time from this page. No long-term commitment required."}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Trust Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-sm text-muted-foreground py-6">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-primary" />
          <span>{t.securePayments}</span>
        </div>
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <span>{t.cancelAnytime}</span>
        </div>
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
