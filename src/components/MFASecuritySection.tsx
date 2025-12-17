import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, ShieldOff, Key, Loader2 } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useLanguage } from '@/hooks/useLanguage';
import { MFASetupDialog } from './MFASetupDialog';
import { MFADisableDialog } from './MFADisableDialog';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export function MFASecuritySection() {
  const { language } = useLanguage();
  const { status, isLoading, fetchStatus } = useMFA();
  
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  
  const t = {
    fr: {
      title: "Authentification à deux facteurs (MFA)",
      description: "Ajoutez une couche de sécurité supplémentaire lors de la connexion.",
      status: "Statut",
      enabled: "Activé",
      disabled: "Désactivé",
      enableMFA: "Activer MFA",
      disableMFA: "Désactiver MFA",
      enabledAt: "Activé le",
      lastVerified: "Dernière vérification",
      recoveryCodes: "Codes de récupération restants",
      lowCodesWarning: "Pensez à régénérer vos codes de récupération",
      helpText: "Utilisez une application comme Google Authenticator ou Authy pour générer des codes de vérification."
    },
    en: {
      title: "Two-Factor Authentication (MFA)",
      description: "Add an extra layer of security when logging in.",
      status: "Status",
      enabled: "Enabled",
      disabled: "Disabled",
      enableMFA: "Enable MFA",
      disableMFA: "Disable MFA",
      enabledAt: "Enabled on",
      lastVerified: "Last verified",
      recoveryCodes: "Recovery codes remaining",
      lowCodesWarning: "Consider regenerating your recovery codes",
      helpText: "Use an app like Google Authenticator or Authy to generate verification codes."
    }
  };
  
  const texts = t[language] || t.en;
  const dateLocale = language === 'fr' ? fr : enUS;
  
  const handleDialogClose = (dialogType: 'setup' | 'disable') => (open: boolean) => {
    if (dialogType === 'setup') {
      setSetupDialogOpen(open);
    } else {
      setDisableDialogOpen(open);
    }
    if (!open) {
      fetchStatus();
    }
  };
  
  if (isLoading && !status) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {texts.title}
          </CardTitle>
          <CardDescription>{texts.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              {status?.enabled ? (
                <ShieldCheck className="h-8 w-8 text-green-500" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{texts.status}:</span>
                  {status?.enabled ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      {texts.enabled}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {texts.disabled}
                    </Badge>
                  )}
                </div>
                {status?.enabled && status.enabledAt && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {texts.enabledAt}: {format(new Date(status.enabledAt), 'PPP', { locale: dateLocale })}
                  </p>
                )}
              </div>
            </div>
            
            {status?.enabled ? (
              <Button variant="outline" onClick={() => setDisableDialogOpen(true)}>
                {texts.disableMFA}
              </Button>
            ) : (
              <Button onClick={() => setSetupDialogOpen(true)}>
                {texts.enableMFA}
              </Button>
            )}
          </div>
          
          {status?.enabled && (
            <div className="space-y-2">
              {status.lastVerifiedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{texts.lastVerified}:</span>
                  <span>{format(new Date(status.lastVerifiedAt), 'PPP p', { locale: dateLocale })}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {texts.recoveryCodes}: <strong>{status.remainingRecoveryCodes}</strong>
                </span>
                {status.remainingRecoveryCodes <= 3 && (
                  <Badge variant="destructive" className="text-xs">
                    {texts.lowCodesWarning}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            {texts.helpText}
          </p>
        </CardContent>
      </Card>
      
      <MFASetupDialog open={setupDialogOpen} onOpenChange={handleDialogClose('setup')} />
      <MFADisableDialog open={disableDialogOpen} onOpenChange={handleDialogClose('disable')} />
    </>
  );
}
