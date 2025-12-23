import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  CreditCard,
  HelpCircle,
  Users,
  FileText,
  Building2,
  Receipt,
  Mail,
  BarChart3,
  Lock,
  ArrowRight,
  RefreshCcw,
  BadgePercent,
  Gift,
  Clock,
  Tags,
  Package,
  Download,
  FileCheck,
  History,
  Shield,
  FileX,
  Palette,
  UsersRound
} from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import Footer from "@/components/Footer";

const PublicPricing = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark");
  });
  
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", update);
    };
  }, []);
  
  const footerLogo = isDark ? logo : logoDark;
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      hero: {
        title: "Tarifs GestionFlow",
        subtitle: "Des plans simples et transparents qui évoluent avec votre entreprise"
      },
      billing: {
        monthly: "Mensuel",
        yearly: "Annuel",
        savings: "Économisez environ 2 mois avec l'abonnement annuel"
      },
      plans: {
        free: {
          name: "Gratuit",
          price: "0 $ CAD",
          period: "/mois",
          description: "Idéal pour découvrir GestionFlow et démarrer votre activité",
          cta: "Commencer gratuitement",
          stripeInfo: "💳 Paiements Stripe (+2 % frais GestionFlow)",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 factures par mois", icon: "FileText" },
            { text: "15 dépenses par mois", icon: "Receipt" },
            { text: "Factures et devis PDF (avec signature GestionFlow)", icon: "FileText" },
            { text: "Design de facture classique", icon: "FileText" },
            { text: "Rapport de revenus", icon: "BarChart3" },
            { text: "Suivi des heures inclus", icon: "Clock" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        },
        premium: {
          name: "Premium",
          price: "19,99 $ CAD",
          yearlyPrice: "199 $ CAD",
          period: "/mois",
          yearlyPeriod: "/an",
          description: "Le meilleur équilibre pour freelances et petites entreprises",
          badge: "⭐ Le plus populaire",
          yearlySavings: "Économisez environ 2 mois avec l'abonnement annuel",
          popularText: "Choisi par la majorité de nos utilisateurs",
          cta: "Passer à Premium",
          stripeInfo: "💳 Paiements Stripe (+1 % frais GestionFlow)",
          stripeNote: "Payez moins de frais sur chaque paiement encaissé",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures et dépenses illimitées", icon: "FileText" },
            { text: "Factures et devis PDF", icon: "FileText" },
            { text: "Designs classique + moderne", icon: "Palette" },
            { text: "Messages de facture et devis personnalisés", icon: "Mail" },
            { text: "Catégories (produits, services, dépenses)", icon: "Tags" },
            { text: "Gestion des stocks", icon: "Package" },
            { text: "Mise à jour automatique des stocks sur ventes", icon: "RefreshCcw" },
            { text: "Rapports fiscaux", icon: "BarChart3" },
            { text: "Paiements Stripe", icon: "CreditCard" },
            { text: "Suivi des heures", icon: "Clock" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        },
        pro: {
          name: "Pro",
          price: "34,99 $ CAD",
          yearlyPrice: "349 $ CAD",
          period: "/mois",
          yearlyPeriod: "/an",
          description: "Pensé pour les entreprises en croissance et la gestion multi-entreprises",
          yearlySavings: "Économisez environ 2 mois",
          cta: "Passer à Pro",
          stripeInfo: "💳 Paiements Stripe (+0,5 % frais GestionFlow)",
          stripeNote: "Optimisez vos coûts de paiement à mesure que votre activité grandit",
          features: [
            { text: "Entreprises illimitées", icon: "Building2" },
            { text: "Tous les designs de factures et devis", icon: "Palette" },
            { text: "Personnalisation avancée des documents", icon: "FileText" },
            { text: "Rapports d'inventaire avancés (valeur stock, ventes par produit)", icon: "Package" },
            { text: "Audit logs (historique illimité)", icon: "History" },
            { text: "Support prioritaire", icon: "UsersRound" },
            { text: "Authentification à deux facteurs (MFA) optionnelle", icon: "Shield" }
          ]
        }
      },
      decision: {
        title: "Quel plan choisir ?",
        items: [
          { condition: "Vous débutez ou testez l'outil ?", plan: "Gratuit", icon: "Zap" },
          { condition: "Vous facturez régulièrement et voulez travailler sans limites ?", plan: "Premium", icon: "Crown" },
          { condition: "Vous gérez plusieurs entreprises ou encaissez des volumes plus élevés ?", plan: "Pro", icon: "Star" }
        ]
      },
      trust: {
        secure: "Tous les paiements sont traités de manière sécurisée via Stripe.",
        cancel: "Aucun engagement à long terme. Changez de plan à tout moment."
      },
      stripeFootnote: {
        line1: "Les paiements sont traités de manière sécurisée via Stripe.",
        line2: "Les frais de traitement standard de Stripe s'appliquent.",
        line3: "GestionFlow ajoute des frais de traitement supplémentaires selon votre plan."
      },
      cta: {
        title: "Prêt à simplifier votre gestion ?",
        subtitle: "Rejoignez des milliers d'entrepreneurs qui gagnent du temps avec GestionFlow.",
        button: "Commencer gratuitement"
      },
      faq: {
        title: "Questions fréquentes",
        subtitle: "Tout ce que vous devez savoir avant de choisir votre plan",
        questions: [
          {
            question: "Puis-je utiliser GestionFlow gratuitement ?",
            answer: "Oui. Le plan Gratuit vous permet de gérer 1 entreprise, jusqu'à 10 clients et de créer jusqu'à 15 factures par mois, sans engagement.",
            highlight: "free"
          },
          {
            question: "Puis-je changer de plan à tout moment ?",
            answer: "Oui. Vous pouvez passer à un plan supérieur ou inférieur à tout moment, directement depuis votre compte.",
            highlight: "planChange"
          },
          {
            question: "Comment fonctionnent les upgrades de plan ?",
            answer: "Lors d'un upgrade, le nouveau plan prend effet immédiatement et le montant est ajusté au prorata selon le temps restant dans votre cycle de facturation.",
            highlight: "planChange"
          },
          {
            question: "Comment fonctionnent les downgrades de plan ?",
            answer: "Lors d'un downgrade, votre plan actuel reste actif jusqu'à la fin du cycle de facturation. Le nouveau plan s'applique automatiquement au prochain renouvellement.",
            highlight: "planChange"
          },
          {
            question: "Y a-t-il un engagement à long terme ?",
            answer: "Non. Aucun engagement à long terme. Vous pouvez annuler ou changer de plan à tout moment.",
            highlight: null
          },
          {
            question: "Comment fonctionnent les paiements et les frais Stripe ?",
            answer: "Les paiements sont traités de manière sécurisée via Stripe. Les frais de traitement standard de Stripe s'appliquent. GestionFlow ajoute des frais supplémentaires selon votre plan : Gratuit : +2 %, Premium : +1 %, Pro : +0,5 %.",
            highlight: "stripe"
          },
          {
            question: "Puis-je passer du plan Gratuit directement au plan Pro ?",
            answer: "Oui. Vous pouvez passer directement au plan Pro à tout moment.",
            highlight: "planChange"
          },
          {
            question: "Que se passe-t-il si je dépasse les limites du plan Gratuit ?",
            answer: "Vous serez invité à passer au plan Premium pour continuer à créer des factures ou ajouter des clients sans interruption.",
            highlight: "free"
          },
          {
            question: "Mes données sont-elles conservées si je change de plan ?",
            answer: "Oui. Toutes vos données restent accessibles, quel que soit votre plan.",
            highlight: null
          },
          {
            question: "GestionFlow est-il adapté aux entreprises canadiennes ?",
            answer: "Oui. GestionFlow est conçu pour les travailleurs autonomes et les PME, avec des rapports clairs et une gestion adaptée aux taxes et aux besoins locaux.",
            highlight: null
          }
        ]
      },
      footer: {
        rights: "Tous droits réservés."
      }
    },
    EN: {
      hero: {
        title: "GestionFlow Pricing",
        subtitle: "Simple and transparent plans that grow with your business"
      },
      billing: {
        monthly: "Monthly",
        yearly: "Yearly",
        savings: "Save about 2 months with annual subscription"
      },
      plans: {
        free: {
          name: "Free",
          price: "$0 CAD",
          period: "/month",
          description: "Ideal to discover GestionFlow and start your business",
          cta: "Get Started Free",
          stripeInfo: "💳 Stripe Payments (+2% GestionFlow fee)",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 invoices per month", icon: "FileText" },
            { text: "15 expenses per month", icon: "Receipt" },
            { text: "PDF invoices & quotes (with GestionFlow branding)", icon: "FileText" },
            { text: "Classic invoice design", icon: "FileText" },
            { text: "Revenue report", icon: "BarChart3" },
            { text: "Time tracking", icon: "Clock" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        },
        premium: {
          name: "Premium",
          price: "$19.99 CAD",
          yearlyPrice: "$199 CAD",
          period: "/month",
          yearlyPeriod: "/year",
          description: "The best balance for freelancers and small businesses",
          badge: "⭐ Most Popular",
          yearlySavings: "Save about 2 months with annual subscription",
          popularText: "Chosen by the majority of our users",
          cta: "Upgrade to Premium",
          stripeInfo: "💳 Stripe Payments (+1% GestionFlow fee)",
          stripeNote: "Pay less fees on every payment received",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices & expenses", icon: "FileText" },
            { text: "PDF invoices & quotes", icon: "FileText" },
            { text: "Classic + Modern designs", icon: "Palette" },
            { text: "Saved invoice & quote body messages", icon: "Mail" },
            { text: "Product, service & expense categories", icon: "Tags" },
            { text: "Inventory management", icon: "Package" },
            { text: "Automatic stock updates on sales", icon: "RefreshCcw" },
            { text: "Tax reports", icon: "BarChart3" },
            { text: "Stripe payments", icon: "CreditCard" },
            { text: "Time tracking", icon: "Clock" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        },
        pro: {
          name: "Pro",
          price: "$34.99 CAD",
          yearlyPrice: "$349 CAD",
          period: "/month",
          yearlyPeriod: "/year",
          description: "Built for growing businesses and multi-company management",
          yearlySavings: "Save about 2 months",
          cta: "Upgrade to Pro",
          stripeInfo: "💳 Stripe Payments (+0.5% GestionFlow fee)",
          stripeNote: "Optimize your payment costs as your business grows",
          features: [
            { text: "Unlimited companies", icon: "Building2" },
            { text: "All invoice & quote designs", icon: "Palette" },
            { text: "Advanced document customization", icon: "FileText" },
            { text: "Advanced inventory reports (stock value, sales by product)", icon: "Package" },
            { text: "Audit logs (unlimited history)", icon: "History" },
            { text: "Priority support", icon: "UsersRound" },
            { text: "Optional multi-factor authentication (MFA)", icon: "Shield" }
          ]
        }
      },
      decision: {
        title: "Which plan to choose?",
        items: [
          { condition: "Starting out or testing the tool?", plan: "Free", icon: "Zap" },
          { condition: "Billing regularly and want to work without limits?", plan: "Premium", icon: "Crown" },
          { condition: "Managing multiple companies or processing higher volumes?", plan: "Pro", icon: "Star" }
        ]
      },
      trust: {
        secure: "All payments are securely processed via Stripe.",
        cancel: "No long-term commitment. Change your plan at any time."
      },
      stripeFootnote: {
        line1: "Payments are processed securely via Stripe.",
        line2: "Standard Stripe processing fees apply.",
        line3: "GestionFlow adds an additional processing fee based on your plan."
      },
      cta: {
        title: "Ready to simplify your business?",
        subtitle: "Join thousands of entrepreneurs saving time with GestionFlow.",
        button: "Get Started Free"
      },
      faq: {
        title: "Frequently Asked Questions",
        subtitle: "Everything you need to know before choosing your plan",
        questions: [
          {
            question: "Can I use GestionFlow for free?",
            answer: "Yes. The Free plan allows you to manage 1 company, up to 10 clients and create up to 15 invoices per month, with no commitment.",
            highlight: "free"
          },
          {
            question: "Can I change my plan at any time?",
            answer: "Yes. You can upgrade or downgrade your plan at any time, directly from your account.",
            highlight: "planChange"
          },
          {
            question: "How do plan upgrades work?",
            answer: "When upgrading, your new plan takes effect immediately and the amount is prorated based on the time remaining in your billing cycle.",
            highlight: "planChange"
          },
          {
            question: "How do plan downgrades work?",
            answer: "When downgrading, your current plan remains active until the end of the billing cycle. The new plan applies automatically at the next renewal.",
            highlight: "planChange"
          },
          {
            question: "Is there a long-term commitment?",
            answer: "No. No long-term commitment. You can cancel or change your plan at any time.",
            highlight: null
          },
          {
            question: "How do payments and Stripe fees work?",
            answer: "Payments are securely processed via Stripe. Standard Stripe processing fees apply. GestionFlow adds an additional fee based on your plan: Free: +2%, Premium: +1%, Pro: +0.5%.",
            highlight: "stripe"
          },
          {
            question: "Can I upgrade from Free directly to Pro?",
            answer: "Yes. You can upgrade directly to Pro at any time.",
            highlight: "planChange"
          },
          {
            question: "What happens if I exceed the Free plan limits?",
            answer: "You will be prompted to upgrade to Premium to continue creating invoices or adding clients without interruption.",
            highlight: "free"
          },
          {
            question: "Is my data kept if I change plans?",
            answer: "Yes. All your data remains accessible, regardless of your plan.",
            highlight: null
          },
          {
            question: "Is GestionFlow suitable for Canadian businesses?",
            answer: "Yes. GestionFlow is designed for self-employed workers and SMBs, with clear reports and management adapted to local taxes and needs.",
            highlight: null
          }
        ]
      },
      footer: {
        rights: "All rights reserved."
      }
    }
  };

  const t = translations[currentLang];

  useSEO({
    title: currentLang === "FR" 
      ? "Tarifs - GestionFlow | Logiciel de gestion d'entreprise" 
      : "Pricing - GestionFlow | Business Management Software",
    description: currentLang === "FR"
      ? "Découvrez nos tarifs simples et transparents. Plan gratuit disponible. Commencez dès aujourd'hui."
      : "Discover our simple and transparent pricing. Free plan available. Start today.",
    keywords: currentLang === "FR"
      ? "tarifs, prix, abonnement, facturation, gestion entreprise"
      : "pricing, plans, subscription, invoicing, business management"
  });

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free': return <Zap className="h-6 w-6" />;
      case 'premium': return <Crown className="h-6 w-6" />;
      case 'pro': return <Star className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
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
      case 'Tags': return <Tags className={iconClass} />;
      case 'Package': return <Package className={iconClass} />;
      case 'Download': return <Download className={iconClass} />;
      case 'FileCheck': return <FileCheck className={iconClass} />;
      case 'History': return <History className={iconClass} />;
      case 'Shield': return <Shield className={iconClass} />;
      case 'FileX': return <FileX className={iconClass} />;
      case 'Palette': return <Palette className={iconClass} />;
      case 'UsersRound': return <UsersRound className={iconClass} />;
      case 'RefreshCcw': return <RefreshCcw className={iconClass} />;
      case 'CreditCard': return <CreditCard className={iconClass} />;
      default: return <Check className={iconClass} />;
    }
  };

  const getDecisionIcon = (iconName: string) => {
    const iconClass = "h-5 w-5";
    switch (iconName) {
      case 'Zap': return <Zap className={iconClass} />;
      case 'Crown': return <Crown className={iconClass} />;
      case 'Star': return <Star className={iconClass} />;
      default: return <Zap className={iconClass} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-1 p-1.5 bg-muted rounded-xl">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`py-3 px-6 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.billing.monthly}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`py-3 px-6 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-background text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.billing.yearly}
            </button>
          </div>
          {billingCycle === "yearly" && (
            <p className="mt-4 text-sm text-primary font-medium animate-in fade-in slide-in-from-top-2">
              ✨ {t.billing.savings}
            </p>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* Free Plan */}
            <Card className="relative border-border hover:border-primary/30 transition-all duration-300 bg-card flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                    {getPlanIcon('free')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.free.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.plans.free.price}</span>
                  <span className="text-muted-foreground ml-1">{t.plans.free.period}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.free.description}</p>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-1">
                <Button 
                  variant="outline" 
                  className="w-full mb-6 h-12 font-medium"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.free.cta}
                </Button>
                <ul className="space-y-3 flex-1">
                  {t.plans.free.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground">{t.plans.free.stripeInfo}</p>
                </div>
              </CardContent>
            </Card>

            {/* Premium Plan - Highlighted */}
            <Card className="relative border-2 border-primary shadow-2xl md:scale-[1.03] bg-card flex flex-col ring-4 ring-primary/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                  {t.plans.premium.badge}
                </span>
              </div>
              <CardHeader className="pb-4 pt-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    {getPlanIcon('premium')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.premium.name}</h3>
                </div>
                <div className="mb-2">
                  {billingCycle === "monthly" ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.premium.price}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.premium.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.premium.yearlyPrice}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.premium.yearlyPeriod}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-primary font-medium mb-2">{t.plans.premium.popularText}</p>
                {billingCycle === "yearly" && (
                  <p className="text-xs text-primary/80 mb-2">✨ {t.plans.premium.yearlySavings}</p>
                )}
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.premium.description}</p>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-1">
                <Button 
                  className="w-full mb-6 h-12 font-medium text-base"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.premium.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <ul className="space-y-3 flex-1">
                  {t.plans.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-bold text-primary">{t.plans.premium.stripeInfo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.plans.premium.stripeNote}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-border hover:border-primary/30 transition-all duration-300 bg-card flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                    {getPlanIcon('pro')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.pro.name}</h3>
                </div>
                <div className="mb-2">
                  {billingCycle === "monthly" ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.pro.price}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.pro.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.pro.yearlyPrice}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.pro.yearlyPeriod}</span>
                    </>
                  )}
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-primary font-medium mb-2">✨ {t.plans.pro.yearlySavings}</p>
                )}
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.pro.description}</p>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-1">
                <Button 
                  variant="outline" 
                  className="w-full mb-6 h-12 font-medium"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.pro.cta}
                </Button>
                <ul className="space-y-3 flex-1">
                  {t.plans.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm font-bold text-primary">{t.plans.pro.stripeInfo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.plans.pro.stripeNote}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stripe Payment Footnote */}
      <section className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-muted/50 border border-border rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {currentLang === "FR" ? "À propos des frais de paiement" : "About Payment Fees"}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{t.stripeFootnote.line1}</p>
              <p>{t.stripeFootnote.line2}</p>
              <p>{t.stripeFootnote.line3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Decision Help Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t.decision.title}</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {t.decision.items.map((item, index) => (
              <div 
                key={index} 
                className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  {getDecisionIcon(item.icon)}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{item.condition}</p>
                <p className="text-lg font-bold text-primary">→ {item.plan}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm">{t.trust.secure}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-sm">{t.trust.cancel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t.faq.title}</h2>
            </div>
            <p className="text-muted-foreground">{t.faq.subtitle}</p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {t.faq.questions.map((item, index) => {
              const getHighlightIcon = (highlight: string | null) => {
                switch (highlight) {
                  case 'planChange':
                    return <RefreshCcw className="h-4 w-4 text-primary shrink-0" />;
                  case 'stripe':
                    return <BadgePercent className="h-4 w-4 text-primary shrink-0" />;
                  case 'free':
                    return <Gift className="h-4 w-4 text-primary shrink-0" />;
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
                      <span className={`text-sm md:text-base font-medium ${
                        isHighlighted ? 'text-foreground' : 'text-foreground'
                      }`}>
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t.cta.title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t.cta.subtitle}
          </p>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg font-medium"
            onClick={() => navigate("/auth")}
          >
            {t.cta.button}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicPricing;
