import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Crown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface LimitReachedAlertProps {
  limitType: 'invoices' | 'expenses' | 'clients' | 'companies';
  currentPlan: 'free' | 'premium' | 'pro';
  onUpgrade?: () => void;
}

export const LimitReachedAlert = ({ limitType, currentPlan, onUpgrade }: LimitReachedAlertProps) => {
  const { language } = useLanguage();

  const messages = {
    en: {
      invoices: {
        title: "Invoice Limit Reached",
        description: "You've reached your monthly invoice limit. Upgrade to create more invoices.",
      },
      expenses: {
        title: "Expense Limit Reached",
        description: "You've reached your monthly expense limit. Upgrade to add more expenses.",
      },
      clients: {
        title: "Client Limit Reached",
        description: "You've reached your client limit. Upgrade to add more clients.",
      },
      companies: {
        title: "Company Limit Reached",
        description: "You've reached your company limit. Upgrade to Pro to manage multiple companies.",
      },
      upgrade: "Upgrade Now",
    },
    fr: {
      invoices: {
        title: "Limite de factures atteinte",
        description: "Vous avez atteint votre limite mensuelle de factures. Améliorez votre plan pour créer plus de factures.",
      },
      expenses: {
        title: "Limite de dépenses atteinte",
        description: "Vous avez atteint votre limite mensuelle de dépenses. Améliorez votre plan pour ajouter plus de dépenses.",
      },
      clients: {
        title: "Limite de clients atteinte",
        description: "Vous avez atteint votre limite de clients. Améliorez votre plan pour ajouter plus de clients.",
      },
      companies: {
        title: "Limite d'entreprises atteinte",
        description: "Vous avez atteint votre limite d'entreprises. Passez à Pro pour gérer plusieurs entreprises.",
      },
      upgrade: "Améliorer maintenant",
    },
  };

  const t = messages[language][limitType];
  const upgradeText = messages[language].upgrade;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t.title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{t.description}</span>
        <Button onClick={onUpgrade} size="sm" variant="outline" className="ml-4">
          <Crown className="h-4 w-4 mr-2" />
          {upgradeText}
        </Button>
      </AlertDescription>
    </Alert>
  );
};