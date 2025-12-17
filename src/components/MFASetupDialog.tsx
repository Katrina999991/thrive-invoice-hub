import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Check, Shield, Key, AlertTriangle } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'qr' | 'verify' | 'recovery' | 'success';

export function MFASetupDialog({ open, onOpenChange }: MFASetupDialogProps) {
  const { language } = useLanguage();
  const { initiateSetup, verifySetup, isLoading, error } = useMFA();
  
  const [step, setStep] = useState<Step>('intro');
  const [setupData, setSetupData] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCopiesCopied] = useState(false);
  const [codesConfirmed, setCodesConfirmed] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  const t = {
    fr: {
      title: "Configurer l'authentification à deux facteurs",
      introTitle: "Protégez votre compte",
      introDesc: "L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte. Vous aurez besoin d'une application d'authentification comme Google Authenticator ou Authy.",
      startSetup: "Commencer la configuration",
      scanQR: "Scannez le QR code",
      scanDesc: "Scannez ce QR code avec votre application d'authentification, ou entrez manuellement la clé secrète ci-dessous.",
      secretKey: "Clé secrète",
      copied: "Copié!",
      copy: "Copier",
      next: "Suivant",
      verifyTitle: "Vérification",
      verifyDesc: "Entrez le code à 6 chiffres affiché dans votre application d'authentification.",
      enterCode: "Code de vérification",
      verify: "Vérifier",
      recoveryTitle: "Codes de récupération",
      recoveryDesc: "Sauvegardez ces codes de récupération dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois pour accéder à votre compte si vous perdez l'accès à votre application d'authentification.",
      recoveryWarning: "Ces codes ne seront affichés qu'une seule fois!",
      copyAll: "Copier tous les codes",
      confirmSaved: "J'ai sauvegardé mes codes de récupération",
      continue: "Continuer",
      successTitle: "MFA activé!",
      successDesc: "L'authentification à deux facteurs est maintenant activée sur votre compte.",
      done: "Terminé",
      cancel: "Annuler"
    },
    en: {
      title: "Set up Two-Factor Authentication",
      introTitle: "Protect your account",
      introDesc: "Two-factor authentication adds an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.",
      startSetup: "Start Setup",
      scanQR: "Scan QR Code",
      scanDesc: "Scan this QR code with your authenticator app, or manually enter the secret key below.",
      secretKey: "Secret Key",
      copied: "Copied!",
      copy: "Copy",
      next: "Next",
      verifyTitle: "Verification",
      verifyDesc: "Enter the 6-digit code shown in your authenticator app.",
      enterCode: "Verification Code",
      verify: "Verify",
      recoveryTitle: "Recovery Codes",
      recoveryDesc: "Save these recovery codes in a safe place. Each code can only be used once to access your account if you lose access to your authenticator app.",
      recoveryWarning: "These codes will only be shown once!",
      copyAll: "Copy all codes",
      confirmSaved: "I have saved my recovery codes",
      continue: "Continue",
      successTitle: "MFA Enabled!",
      successDesc: "Two-factor authentication is now enabled on your account.",
      done: "Done",
      cancel: "Cancel"
    }
  };
  
  const texts = t[language] || t.en;
  
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('intro');
      setSetupData(null);
      setCode('');
      setRecoveryCodes([]);
      setCopiesCopied(false);
      setCodesConfirmed(false);
      setVerifyError(null);
    }
  }, [open]);
  
  const handleStartSetup = async () => {
    const data = await initiateSetup();
    if (data) {
      setSetupData(data);
      setStep('qr');
    }
  };
  
  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      toast({ title: texts.copied });
    }
  };
  
  const handleVerify = async () => {
    setVerifyError(null);
    const result = await verifySetup(code);
    if (result.success && result.recoveryCodes) {
      setRecoveryCodes(result.recoveryCodes);
      setStep('recovery');
    } else {
      setVerifyError(error || 'Code invalide');
    }
  };
  
  const handleCopyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiesCopied(true);
    toast({ title: texts.copied });
  };
  
  const handleComplete = () => {
    setStep('success');
  };
  
  const handleDone = () => {
    onOpenChange(false);
  };
  
  // Generate QR code URL using Google Charts API (simple approach)
  const qrCodeUrl = setupData?.otpAuthUri 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpAuthUri)}`
    : '';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {texts.title}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'intro' && (
          <div className="space-y-4">
            <DialogDescription>{texts.introDesc}</DialogDescription>
            <Button onClick={handleStartSetup} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {texts.startSetup}
            </Button>
          </div>
        )}
        
        {step === 'qr' && setupData && (
          <div className="space-y-4">
            <DialogDescription>{texts.scanDesc}</DialogDescription>
            
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            
            <div className="space-y-2">
              <Label>{texts.secretKey}</Label>
              <div className="flex gap-2">
                <Input value={setupData.secret} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopySecret}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                {texts.cancel}
              </Button>
              <Button onClick={() => setStep('verify')} className="flex-1">
                {texts.next}
              </Button>
            </div>
          </div>
        )}
        
        {step === 'verify' && (
          <div className="space-y-4">
            <DialogDescription>{texts.verifyDesc}</DialogDescription>
            
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
            
            {verifyError && (
              <Alert variant="destructive">
                <AlertDescription>{verifyError}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                {texts.cancel}
              </Button>
              <Button onClick={handleVerify} disabled={code.length !== 6 || isLoading} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {texts.verify}
              </Button>
            </div>
          </div>
        )}
        
        {step === 'recovery' && (
          <div className="space-y-4">
            <DialogDescription>{texts.recoveryDesc}</DialogDescription>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{texts.recoveryWarning}</AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="px-2 py-1">{code}</div>
              ))}
            </div>
            
            <Button variant="outline" onClick={handleCopyRecoveryCodes} className="w-full">
              {codesCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {texts.copyAll}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="confirmCodes" 
                checked={codesConfirmed}
                onCheckedChange={(checked) => setCodesConfirmed(checked === true)}
              />
              <Label htmlFor="confirmCodes" className="text-sm">
                {texts.confirmSaved}
              </Label>
            </div>
            
            <Button onClick={handleComplete} disabled={!codesConfirmed} className="w-full">
              {texts.continue}
            </Button>
          </div>
        )}
        
        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Check className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{texts.successTitle}</h3>
              <p className="text-muted-foreground">{texts.successDesc}</p>
            </div>
            <Button onClick={handleDone} className="w-full">
              {texts.done}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
