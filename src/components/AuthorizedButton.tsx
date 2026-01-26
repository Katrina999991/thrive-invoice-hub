import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useAuthorization, FeatureKey, LimitType } from "@/hooks/useAuthorization";
import { useLanguage } from "@/hooks/useLanguage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Crown } from "lucide-react";

interface AuthorizedButtonProps extends ButtonProps {
  companyId: string | null;
  permission?: string;
  featureKey?: FeatureKey;
  checkLimit?: LimitType;
  showTooltip?: boolean;
  hideWhenUnauthorized?: boolean;
}

/**
 * Button that is automatically disabled when user lacks authorization
 * Shows appropriate tooltip explaining why the button is disabled
 */
export function AuthorizedButton({
  companyId,
  permission,
  featureKey,
  checkLimit,
  showTooltip = true,
  hideWhenUnauthorized = false,
  children,
  disabled,
  ...props
}: AuthorizedButtonProps) {
  const { authorizeSync, canManageBilling, loading } = useAuthorization(companyId);
  const { language } = useLanguage();

  const result = authorizeSync(permission, featureKey, checkLimit);
  const isDisabled = disabled || !result.allowed || loading;

  const translations = {
    fr: {
      missing_permission: "Vous n'avez pas la permission pour cette action",
      feature_not_in_plan: canManageBilling 
        ? "Passez à un plan supérieur pour débloquer cette fonctionnalité" 
        : "Cette fonctionnalité n'est pas incluse dans le plan de l'entreprise",
      limit_reached: `Limite atteinte (${result.current}/${result.limit})`,
      member_not_active: "Votre accès a été suspendu",
      not_a_member: "Vous n'êtes pas membre de cette entreprise",
    },
    en: {
      missing_permission: "You don't have permission for this action",
      feature_not_in_plan: canManageBilling 
        ? "Upgrade to a higher plan to unlock this feature" 
        : "This feature is not included in the company's plan",
      limit_reached: `Limit reached (${result.current}/${result.limit})`,
      member_not_active: "Your access has been suspended",
      not_a_member: "You are not a member of this company",
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const getTooltipMessage = () => {
    if (result.allowed) return null;
    return t[result.reason as keyof typeof t] || t.missing_permission;
  };

  const getIcon = () => {
    if (result.allowed) return null;
    if (result.reason === "feature_not_in_plan" || result.reason === "limit_reached") {
      return <Crown className="h-4 w-4 mr-1" />;
    }
    return <Lock className="h-4 w-4 mr-1" />;
  };

  if (hideWhenUnauthorized && !result.allowed) {
    return null;
  }

  const button = (
    <Button {...props} disabled={isDisabled}>
      {!result.allowed && getIcon()}
      {children}
    </Button>
  );

  if (showTooltip && !result.allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
