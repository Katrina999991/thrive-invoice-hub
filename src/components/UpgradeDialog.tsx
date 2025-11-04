import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Zap, Calendar } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImmediateUpgrade: () => void;
  onScheduledUpgrade: () => void;
  subscriptionEnd: string | null;
  language: 'en' | 'fr';
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export const UpgradeDialog = ({
  open,
  onOpenChange,
  onImmediateUpgrade,
  onScheduledUpgrade,
  subscriptionEnd,
  language,
  price,
  billingCycle,
}: UpgradeDialogProps) => {
  const translations = {
    en: {
      title: "Upgrade to Pro",
      description: "How would you like to upgrade your plan?",
      immediate: "Upgrade Now",
      immediateDesc: `Pay the prorated difference immediately and access Pro features right away`,
      scheduled: "Schedule Upgrade",
      scheduledDesc: subscriptionEnd 
        ? `Upgrade will take effect on ${new Date(subscriptionEnd).toLocaleDateString()} at no additional cost until then`
        : "Upgrade will take effect at the end of your current billing period",
      cancel: "Cancel",
      perMonth: "/month",
      perYear: "/year",
    },
    fr: {
      title: "Passer au plan Pro",
      description: "Comment souhaitez-vous effectuer la mise à niveau ?",
      immediate: "Mettre à niveau maintenant",
      immediateDesc: `Payez la différence au prorata immédiatement et accédez aux fonctionnalités Pro tout de suite`,
      scheduled: "Planifier la mise à niveau",
      scheduledDesc: subscriptionEnd
        ? `La mise à niveau prendra effet le ${new Date(subscriptionEnd).toLocaleDateString()} sans frais supplémentaires d'ici là`
        : "La mise à niveau prendra effet à la fin de votre période de facturation actuelle",
      cancel: "Annuler",
      perMonth: "/mois",
      perYear: "/an",
    },
  };

  const t = translations[language];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">{t.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {t.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          {/* Immediate Upgrade Option */}
          <button
            onClick={() => {
              onOpenChange(false);
              onImmediateUpgrade();
            }}
            className="flex items-start gap-4 p-4 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="rounded-full p-2 bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{t.immediate}</h3>
              <p className="text-sm text-muted-foreground">
                {t.immediateDesc}
              </p>
              <p className="text-sm font-medium mt-2">
                Pro: ${price}{billingCycle === 'monthly' ? t.perMonth : t.perYear}
              </p>
            </div>
          </button>

          {/* Scheduled Upgrade Option */}
          <button
            onClick={() => {
              onOpenChange(false);
              onScheduledUpgrade();
            }}
            className="flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors text-left group"
          >
            <div className="rounded-full p-2 bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{t.scheduled}</h3>
              <p className="text-sm text-muted-foreground">
                {t.scheduledDesc}
              </p>
            </div>
          </button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
