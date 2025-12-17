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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Key } from 'lucide-react';
import { verifyMFALogin, verifyRecoveryCodeLogin } from '@/hooks/useMFA';
import { useLanguage } from '@/hooks/useLanguage';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MFAVerificationDialogProps {
  open: boolean;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerificationDialog({ open, userId, onSuccess, onCancel }: MFAVerificationDialogProps) {
  const { language } = useLanguage();
  
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = {
    fr: {
      title: "Vérification MFA",
      desc: "Entrez le code à 6 chiffres de votre application d'authentification.",
      enterCode: "Code de vérification",
      verify: "Vérifier",
      useRecovery: "Utiliser un code de récupération",
      useTOTP: "Utiliser le code d'authentification",
      recoveryTitle: "Code de récupération",
      recoveryDesc: "Entrez l'un de vos codes de récupération.",
      recoveryPlaceholder: "XXXX-XXXX-XX",
      cancel: "Annuler",
      remainingCodes: "codes de récupération restants"
    },
    en: {
      title: "MFA Verification",
      desc: "Enter the 6-digit code from your authenticator app.",
      enterCode: "Verification Code",
      verify: "Verify",
      useRecovery: "Use a recovery code",
      useTOTP: "Use authenticator code",
      recoveryTitle: "Recovery Code",
      recoveryDesc: "Enter one of your recovery codes.",
      recoveryPlaceholder: "XXXX-XXXX-XX",
      cancel: "Cancel",
      remainingCodes: "recovery codes remaining"
    }
  };
  
  const texts = t[language] || t.en;
  
  const handleVerifyTOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await verifyMFALogin(userId, code);
    
    setIsLoading(false);
    
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || (language === 'fr' ? 'Code invalide' : 'Invalid code'));
    }
  };
  
  const handleVerifyRecovery = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await verifyRecoveryCodeLogin(userId, recoveryCode);
    
    setIsLoading(false);
    
    if (result.success) {
      if (result.remainingCodes !== undefined && result.remainingCodes <= 3) {
        // Warn user about low recovery codes
        console.warn(`Only ${result.remainingCodes} ${texts.remainingCodes}`);
      }
      onSuccess();
    } else {
      setError(result.error || (language === 'fr' ? 'Code invalide' : 'Invalid code'));
    }
  };
  
  const handleSubmit = () => {
    if (mode === 'totp') {
      handleVerifyTOTP();
    } else {
      handleVerifyRecovery();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'totp' ? <Shield className="h-5 w-5 text-primary" /> : <Key className="h-5 w-5 text-primary" />}
            {mode === 'totp' ? texts.title : texts.recoveryTitle}
          </DialogTitle>
          <DialogDescription>
            {mode === 'totp' ? texts.desc : texts.recoveryDesc}
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'totp' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{texts.enterCode}</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleSubmit}
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
            
            <Button 
              variant="link" 
              onClick={() => { setMode('recovery'); setError(null); }}
              className="w-full"
            >
              {texts.useRecovery}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{texts.recoveryTitle}</Label>
              <Input
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder={texts.recoveryPlaceholder}
                className="font-mono text-center"
              />
            </div>
            
            <Button 
              variant="link" 
              onClick={() => { setMode('totp'); setError(null); }}
              className="w-full"
            >
              {texts.useTOTP}
            </Button>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {texts.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (mode === 'totp' ? code.length !== 6 : !recoveryCode.trim())} 
            className="flex-1"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {texts.verify}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
