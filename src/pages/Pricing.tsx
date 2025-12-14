import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
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
  HelpCircle,
  RefreshCcw,
  BadgePercent,
  XCircle
} from "lucide-react";
import { useState, useEffect } from "react";
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
      saveYearly: "Save about 2 months with annual subscription",
      saveYearlyShort: "Save ~2 months",
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
      cancelAnytime: "No long-term commitment. Change your plan at any time.",
      policyTitle: "Plan Change Policy",
      policyIntro: "If you downgrade to a lower plan (e.g., from Pro to Premium), here's what happens:",
      policyKeepData: "You keep all your existing data (companies, clients, invoices, expenses)",
      policyViewEdit: "You can view, edit, and delete all your data",
      policyNoCreate: "However, you won't be able to create new entities if you exceed the new plan's limits",
      policyExample: "Example: If you have 3 companies on the Pro plan and downgrade to Premium (limit: 1 company), you keep your 3 companies but will need to delete 2 before you can create a new one.",
      freeUserTitle: "Unlock Your Full Potential",
      freeUserDesc: "Upgrade to Premium or Pro and enjoy unlimited invoices, PDF downloads, and reduced Stripe fees.",
      faq: {
        title: "Frequently Asked Questions About Your Subscription",
        subtitle: "Everything you need to know to manage your plan",
        questions: [
          {
            question: "When does a plan change take effect?",
            answer: "When upgrading, the new plan takes effect immediately. When downgrading, your current plan stays active until the end of the billing cycle.",
            highlight: "planChange"
          },
          {
            question: "How does proration work?",
            answer: "When you upgrade to a higher plan, the amount already paid is taken into account and only the balance corresponding to the remaining time is billed.",
            highlight: "planChange"
          },
          {
            question: "Can I change plans multiple times?",
            answer: "Yes. You can change your plan at any time from this page, with no long-term commitment.",
            highlight: null
          },
          {
            question: "What happens if I downgrade my plan?",
            answer: "You keep all the features of your current plan until the end of your billing period. The new plan will automatically apply at the next renewal.",
            highlight: "planChange"
          },
          {
            question: "Will my data be lost if I downgrade?",
            answer: "No. All your data is kept. However, some features may become unavailable depending on the active plan.",
            highlight: null
          },
          {
            question: "How do Stripe payments work?",
            answer: "All payments are processed securely via Stripe.",
            highlight: "stripe"
          },
          {
            question: "Why do Stripe fees decrease based on the plan?",
            answer: "Premium and Pro plans offer reduced Stripe fees to support businesses that process higher volumes.",
            highlight: "stripe"
          },
          {
            question: "Can I upgrade directly from Free to Pro?",
            answer: "Yes. You can upgrade directly to Pro at any time.",
            highlight: "planChange"
          },
          {
            question: "Can I downgrade to a lower plan later?",
            answer: "Yes. You can downgrade your plan at any time. The change will take effect at the end of your billing cycle.",
            highlight: "planChange"
          },
          {
            question: "How can I cancel my subscription?",
            answer: "You can cancel your subscription at any time from this page. No long-term commitment is required.",
            highlight: "cancel"
          }
        ]
      },
      plans: {
        free: {
          name: "Free",
          description: "Ideal to discover GestionFlow and start your business",
          stripeInfo: "💳 Stripe Payments — 2%",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 invoices per month", icon: "FileText" },
            { text: "10 expenses per month", icon: "Receipt" },
            { text: "Email invoice sending", icon: "Mail" },
            { text: "1 invoice template (Classic - blue)", icon: "FileText" },
            { text: "Revenue report", icon: "BarChart3" }
          ]
        },
        premium: {
          name: "Premium",
          description: "The best balance for freelancers and small businesses",
          popular: "⭐ Most Popular",
          chosenBy: "Chosen by most of our users",
          stripeInfo: "💳 Stripe Payments — 1%",
          stripeNote: "Pay less fees on every payment received",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices", icon: "FileText" },
            { text: "Unlimited expenses", icon: "Receipt" },
            { text: "PDF invoice download", icon: "FileText" },
            { text: "2 invoice templates (Classic + Modern)", icon: "FileText" },
            { text: "Category management (products, services, expenses)", icon: "BarChart3" },
            { text: "Reports: revenue + taxes", icon: "BarChart3" }
          ]
        },
        pro: {
          name: "Pro",
          description: "Built for growing businesses and multi-company management",
          stripeInfo: "💳 Stripe Payments — 0.5%",
          stripeNote: "Optimize your payment costs as your business grows",
          features: [
            { text: "Unlimited companies", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices", icon: "FileText" },
            { text: "Unlimited expenses", icon: "Receipt" },
            { text: "All invoice templates", icon: "FileText" },
            { text: "All reports", icon: "BarChart3" },
            { text: "Full email customization", icon: "Mail" }
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
      saveYearly: "Économisez environ 2 mois avec l'abonnement annuel",
      saveYearlyShort: "Économisez ~2 mois",
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
      cancelAnytime: "Aucun engagement à long terme. Changez de plan à tout moment.",
      policyTitle: "Politique de changement de plan",
      policyIntro: "Si vous passez à un plan inférieur (par exemple de Pro à Premium), voici ce qui se passe :",
      policyKeepData: "Vous conservez toutes vos données existantes (entreprises, clients, factures, dépenses)",
      policyViewEdit: "Vous pouvez consulter, modifier et supprimer toutes vos données",
      policyNoCreate: "Cependant, vous ne pourrez pas créer de nouvelles entités si vous dépassez les limites du nouveau plan",
      policyExample: "Exemple : Si vous avez 3 entreprises sur le plan Pro et que vous passez au plan Premium (limite : 1 entreprise), vous gardez vos 3 entreprises mais vous devrez en supprimer 2 avant de pouvoir en créer une nouvelle.",
      freeUserTitle: "Débloquez tout votre potentiel",
      freeUserDesc: "Passez à Premium ou Pro et profitez de factures illimitées, du téléchargement PDF et de frais Stripe réduits.",
      faq: {
        title: "Questions fréquentes sur votre abonnement",
        subtitle: "Tout ce que vous devez savoir pour gérer votre plan",
        questions: [
          {
            question: "Quand un changement de plan prend-il effet ?",
            answer: "Lors d'un upgrade, le nouveau plan prend effet immédiatement. Lors d'un downgrade, votre plan actuel reste actif jusqu'à la fin du cycle de facturation.",
            highlight: "planChange"
          },
          {
            question: "Comment fonctionne l'ajustement au prorata ?",
            answer: "Lorsque vous passez à un plan supérieur, le montant déjà payé est pris en compte et seul le solde correspondant au temps restant est facturé.",
            highlight: "planChange"
          },
          {
            question: "Puis-je changer de plan plusieurs fois ?",
            answer: "Oui. Vous pouvez changer de plan à tout moment depuis cette page, sans engagement à long terme.",
            highlight: null
          },
          {
            question: "Que se passe-t-il si je downgrade mon plan ?",
            answer: "Vous conservez toutes les fonctionnalités de votre plan actuel jusqu'à la fin de votre période de facturation. Le nouveau plan sera appliqué automatiquement au prochain renouvellement.",
            highlight: "planChange"
          },
          {
            question: "Mes données seront-elles perdues si je downgrade ?",
            answer: "Non. Toutes vos données sont conservées. Certaines fonctionnalités peuvent toutefois devenir indisponibles selon le plan actif.",
            highlight: null
          },
          {
            question: "Comment fonctionnent les paiements Stripe ?",
            answer: "Tous les paiements sont traités de manière sécurisée via Stripe.",
            highlight: "stripe"
          },
          {
            question: "Pourquoi les frais Stripe diminuent-ils selon le plan ?",
            answer: "Les plans Premium et Pro offrent des frais Stripe réduits afin de soutenir les entreprises qui encaissent des volumes plus élevés.",
            highlight: "stripe"
          },
          {
            question: "Puis-je passer directement du plan Gratuit au plan Pro ?",
            answer: "Oui. Vous pouvez passer directement au plan Pro à tout moment.",
            highlight: "planChange"
          },
          {
            question: "Puis-je revenir à un plan inférieur plus tard ?",
            answer: "Oui. Vous pouvez downgrade votre plan à tout moment. Le changement prendra effet à la fin de votre cycle de facturation.",
            highlight: "planChange"
          },
          {
            question: "Comment puis-je annuler mon abonnement ?",
            answer: "Vous pouvez annuler votre abonnement à tout moment depuis cette page. Aucun engagement à long terme n'est requis.",
            highlight: "cancel"
          }
        ]
      },
      plans: {
        free: {
          name: "Gratuit",
          description: "Idéal pour découvrir GestionFlow et démarrer votre activité",
          stripeInfo: "💳 Paiements Stripe — 2 %",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 factures par mois", icon: "FileText" },
            { text: "10 dépenses par mois", icon: "Receipt" },
            { text: "Envoi de factures par courriel", icon: "Mail" },
            { text: "1 modèle de facture (Classique – bleu)", icon: "FileText" },
            { text: "Rapport de revenus", icon: "BarChart3" }
          ]
        },
        premium: {
          name: "Premium",
          description: "Le meilleur équilibre pour freelances et petites entreprises",
          popular: "⭐ Le plus populaire",
          chosenBy: "Choisi par la majorité de nos utilisateurs",
          stripeInfo: "💳 Paiements Stripe — 1 %",
          stripeNote: "Réduisez vos frais sur chaque paiement encaissé",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures illimitées", icon: "FileText" },
            { text: "Dépenses illimitées", icon: "Receipt" },
            { text: "Téléchargement PDF des factures", icon: "FileText" },
            { text: "2 modèles de factures (Classique + Moderne)", icon: "FileText" },
            { text: "Gestion des catégories (produits, services, dépenses)", icon: "BarChart3" },
            { text: "Rapports : revenus + taxes", icon: "BarChart3" }
          ]
        },
        pro: {
          name: "Pro",
          description: "Pensé pour les entreprises en croissance et la gestion multi-entreprises",
          stripeInfo: "💳 Paiements Stripe — 0,5 %",
          stripeNote: "Optimisez vos coûts de paiement à mesure que votre activité grandit",
          features: [
            { text: "Entreprises illimitées", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures illimitées", icon: "FileText" },
            { text: "Dépenses illimitées", icon: "Receipt" },
            { text: "Tous les modèles de factures", icon: "FileText" },
            { text: "Tous les rapports", icon: "BarChart3" },
            { text: "Personnalisation complète des courriels", icon: "Mail" }
          ]
        }
      }
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
      default: return <Check className={iconClass} />;
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

    const planName = getPlanData(planType).name;
    return { 
      text: `${t.downgradeTo} ${planName}`, 
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
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12 items-stretch">
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
                  ? 'border-2 border-primary shadow-2xl md:scale-[1.03] ring-4 ring-primary/10' 
                  : 'border-border hover:border-primary/30'
              } ${isCurrent ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            >
              {/* Popular Badge for Premium */}
              {isPremium && 'popular' in planData && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-5 py-2 shadow-lg font-bold whitespace-nowrap">
                    {(planData as typeof t.plans.premium).popular}
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-3 right-4 z-10">
                  <Badge variant="secondary" className="bg-foreground text-background px-3 py-1 font-medium">
                    ✓ {t.currentPlan}
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`pt-8 ${isPremium ? 'pt-10' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${
                    isPremium ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {getPlanIcon(plan.plan_type)}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{planData.name}</h3>
                </div>
                
                <div className="mb-2">
                  <span className="text-4xl font-bold text-foreground">{price} $</span>
                  <span className="text-muted-foreground text-lg">
                    {billingCycle === 'monthly' ? t.perMonth : t.perYear}
                  </span>
                </div>

                {isPremium && 'chosenBy' in planData && (
                  <p className="text-xs text-primary font-medium mb-2">
                    {(planData as typeof t.plans.premium).chosenBy}
                  </p>
                )}

                {billingCycle === 'yearly' && plan.plan_type !== 'free' && (
                  <p className="text-xs text-primary/80 mb-2">✨ {t.saveYearlyShort}</p>
                )}
                
                <p className="text-muted-foreground text-sm leading-relaxed">{planData.description}</p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {planData.features.map((feature: { text: string; icon: string }, index: number) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Stripe Info */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className={`text-sm font-bold ${isPremium || isPro ? 'text-primary' : 'text-muted-foreground'}`}>
                    {planData.stripeInfo}
                  </p>
                  {'stripeNote' in planData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(planData as typeof t.plans.premium).stripeNote}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                <Button 
                  className={`w-full h-12 font-medium ${
                    buttonConfig.isUpgrade && isPremium ? 'text-base' : ''
                  }`}
                  variant={buttonConfig.variant}
                  disabled={buttonConfig.disabled || stripeLoading}
                  onClick={() => handleUpgrade(plan.plan_type)}
                  size="lg"
                >
                  {buttonConfig.icon}
                  {buttonConfig.isUpgrade && <CreditCard className="h-4 w-4 mr-2" />}
                  {buttonConfig.text}
                  {buttonConfig.isUpgrade && <ArrowRight className="h-4 w-4 ml-2" />}
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

      {/* FAQ Section */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{t.faq.title}</h2>
          </div>
          <p className="text-muted-foreground text-sm">{t.faq.subtitle}</p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-3 max-w-3xl mx-auto">
          {t.faq.questions.map((item, index) => {
            const getHighlightIcon = (highlight: string | null) => {
              switch (highlight) {
                case 'planChange':
                  return <RefreshCcw className="h-4 w-4 text-primary shrink-0" />;
                case 'stripe':
                  return <BadgePercent className="h-4 w-4 text-primary shrink-0" />;
                case 'cancel':
                  return <XCircle className="h-4 w-4 text-primary shrink-0" />;
                default:
                  return null;
              }
            };

            const highlightIcon = getHighlightIcon(item.highlight);
            const isHighlighted = item.highlight !== null;

            return (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className={`border rounded-xl px-4 bg-card ${
                  isHighlighted 
                    ? 'border-primary/30 ring-1 ring-primary/10' 
                    : 'border-border'
                }`}
              >
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <div className="flex items-center gap-3">
                    {highlightIcon}
                    <span className="text-sm md:text-base font-medium text-foreground">
                      {item.question}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-5 pl-7">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

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
