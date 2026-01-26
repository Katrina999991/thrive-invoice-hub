import React from "react";
import { useAuthorization, FeatureKey, LimitType, AuthorizationResult } from "@/hooks/useAuthorization";
import { useLanguage } from "@/hooks/useLanguage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, Crown, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthorizationGateProps {
  companyId: string | null;
  permission?: string;
  featureKey?: FeatureKey;
  checkLimit?: LimitType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

/**
 * Component that gates content based on authorization
 * Shows appropriate messages for different block reasons
 */
export function AuthorizationGate({
  companyId,
  permission,
  featureKey,
  checkLimit,
  children,
  fallback,
  showMessage = true
}: AuthorizationGateProps) {
  const { authorizeSync, canManageBilling, loading } = useAuthorization(companyId);
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (loading) {
    return fallback || null;
  }

  const result = authorizeSync(permission, featureKey, checkLimit);

  if (result.allowed) {
    return <>{children}</>;
  }

  if (!showMessage) {
    return fallback || null;
  }

  return (
    <AuthorizationMessage 
      result={result} 
      canManageBilling={canManageBilling}
      language={language}
      onUpgrade={() => navigate("/dashboard/pricing")}
    />
  );
}

interface AuthorizationMessageProps {
  result: AuthorizationResult;
  canManageBilling: boolean;
  language: string;
  onUpgrade?: () => void;
}

/**
 * Displays appropriate message based on authorization failure reason
 */
export function AuthorizationMessage({ 
  result, 
  canManageBilling,
  language,
  onUpgrade 
}: AuthorizationMessageProps) {
  const translations = {
    fr: {
      missing_permission: "Vous n'avez pas accès à cette action.",
      missing_permission_desc: "Contactez l'administrateur de votre entreprise pour obtenir les permissions nécessaires.",
      feature_not_in_plan: "Cette fonctionnalité n'est pas incluse dans votre plan.",
      feature_not_in_plan_desc_admin: "Passez à un plan supérieur pour débloquer cette fonctionnalité.",
      feature_not_in_plan_desc_member: "L'administrateur de l'entreprise peut mettre à niveau le plan.",
      limit_reached: "Limite atteinte",
      limit_reached_desc: (current: number, limit: number) => 
        `Vous avez atteint la limite de ${limit} pour ce mois (utilisé: ${current}).`,
      limit_reached_desc_admin: "Passez à un plan supérieur pour augmenter vos limites.",
      limit_reached_desc_member: "L'administrateur peut mettre à niveau le plan pour augmenter les limites.",
      member_not_active: "Votre accès à cette entreprise a été suspendu.",
      not_a_member: "Vous n'êtes pas membre de cette entreprise.",
      upgrade: "Mettre à niveau"
    },
    en: {
      missing_permission: "You don't have access to this action.",
      missing_permission_desc: "Contact your company administrator to get the required permissions.",
      feature_not_in_plan: "This feature is not included in your plan.",
      feature_not_in_plan_desc_admin: "Upgrade to a higher plan to unlock this feature.",
      feature_not_in_plan_desc_member: "The company administrator can upgrade the plan.",
      limit_reached: "Limit reached",
      limit_reached_desc: (current: number, limit: number) => 
        `You have reached the limit of ${limit} for this month (used: ${current}).`,
      limit_reached_desc_admin: "Upgrade to a higher plan to increase your limits.",
      limit_reached_desc_member: "The administrator can upgrade the plan to increase limits.",
      member_not_active: "Your access to this company has been suspended.",
      not_a_member: "You are not a member of this company.",
      upgrade: "Upgrade"
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const getIcon = () => {
    switch (result.reason) {
      case "missing_permission":
      case "member_not_active":
      case "not_a_member":
        return <Lock className="h-5 w-5" />;
      case "feature_not_in_plan":
        return <Crown className="h-5 w-5" />;
      case "limit_reached":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Lock className="h-5 w-5" />;
    }
  };

  const getMessage = () => {
    switch (result.reason) {
      case "missing_permission":
        return {
          title: t.missing_permission,
          description: t.missing_permission_desc,
          showUpgrade: false
        };
      case "feature_not_in_plan":
        return {
          title: t.feature_not_in_plan,
          description: canManageBilling 
            ? t.feature_not_in_plan_desc_admin 
            : t.feature_not_in_plan_desc_member,
          showUpgrade: canManageBilling
        };
      case "limit_reached":
        return {
          title: t.limit_reached,
          description: t.limit_reached_desc(result.current || 0, result.limit || 0) + " " + 
            (canManageBilling ? t.limit_reached_desc_admin : t.limit_reached_desc_member),
          showUpgrade: canManageBilling
        };
      case "member_not_active":
        return {
          title: t.member_not_active,
          description: "",
          showUpgrade: false
        };
      case "not_a_member":
        return {
          title: t.not_a_member,
          description: "",
          showUpgrade: false
        };
      default:
        return {
          title: t.missing_permission,
          description: "",
          showUpgrade: false
        };
    }
  };

  const message = getMessage();

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <div className="text-amber-600 dark:text-amber-400 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
            {message.title}
          </AlertDescription>
          {message.description && (
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm mt-1">
              {message.description}
            </AlertDescription>
          )}
          {message.showUpgrade && onUpgrade && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onUpgrade}
              className="mt-3 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
            >
              <Crown className="h-4 w-4 mr-2" />
              {t.upgrade}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
