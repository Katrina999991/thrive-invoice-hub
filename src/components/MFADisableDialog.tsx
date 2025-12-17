import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { logAuditEvent } from '@/lib/auditLogger';

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MFADisableDialog({ open, onOpenChange }: MFADisableDialogProps) {
  const { language } = useLanguage();
  const { user, username } = useAuth();
  const { disable, isLoading } = useMFA();
  
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const t = {
    fr: {
      title: "Désactiver l'authentification à deux facteurs",
      desc: "Entrez le code à 6 chiffres de votre application d'authentification pour confirmer la désactivation.",
      warning: "Votre compte sera moins sécurisé sans l'authentification à deux facteurs.",
      enterCode: "Code de vérification",
      disable: "Désactiver MFA",
      cancel: "Annuler",
      success: "MFA désactivé avec succès"
    },
    en: {
      title: "Disable Two-Factor Authentication",
      desc: "Enter the 6-digit code from your authenticator app to confirm disabling.",
      warning: "Your account will be less secure without two-factor authentication.",
      enterCode: "Verification Code",
      disable: "Disable MFA",
      cancel: "Cancel",
      success: "MFA disabled successfully"
    }
  };
  
  const texts = t[language] || t.en;
  
  const handleDisable = async () => {
    setError(null);
    const success = await disable(code);
    if (success) {
      // Log MFA disabled event
      if (user?.id) {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0],
          category: 'authentication',
          eventType: 'mfa_disabled',
          description: language === 'fr' ? 'Authentification à deux facteurs désactivée' : 'Two-factor authentication disabled',
        });
      }
      toast({ title: texts.success });
      onOpenChange(false);
      setCode('');
    } else {
      setError(language === 'fr' ? 'Code invalide' : 'Invalid code');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setCode('');
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldOff className="h-5 w-5" />
            {texts.title}
          </DialogTitle>
          <DialogDescription>{texts.desc}</DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{texts.warning}</AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label>{texts.enterCode}</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {texts.cancel}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDisable} 
            disabled={code.length !== 6 || isLoading} 
            className="flex-1"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {texts.disable}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
