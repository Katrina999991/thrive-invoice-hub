
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { validatePassword } from "@/lib/passwordValidation";
import { logAuditEvent } from "@/lib/auditLogger";

export default function PasswordChangeForm() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const { updatePassword, user, username } = useAuth();
  const { language } = useLanguage();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setPasswordErrors([]);

    // Validate password
    const validation = validatePassword(newPassword, language);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("password.error.match"));
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);
    
    if (error) {
      setError(error.message);
      toast({
        title: t("password.error.title"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Log password change event
      if (user?.id) {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0],
          category: 'authentication',
          eventType: 'password_changed',
          description: language === 'fr' ? 'Mot de passe modifié' : 'Password changed',
        });
      }
      
      toast({
        title: t("password.success.title"),
        description: t("password.success.description"),
      });
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {t("password.title")}
        </CardTitle>
        <CardDescription>
          {t("password.description")}
        </CardDescription>
        <div className="bg-muted/50 p-4 rounded-lg space-y-2 mt-4">
          <p className="text-sm font-medium">
            {language === 'en' ? 'Password requirements:' : 'Exigences du mot de passe :'}
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{language === 'en' ? 'At least 8 characters' : 'Au moins 8 caractères'}</li>
            <li>{language === 'en' ? 'One uppercase letter' : 'Une lettre majuscule'}</li>
            <li>{language === 'en' ? 'One lowercase letter' : 'Une lettre minuscule'}</li>
            <li>{language === 'en' ? 'One number' : 'Un chiffre'}</li>
            <li>{language === 'en' ? 'One special character (!@#$%^&*)' : 'Un caractère spécial (!@#$%^&*)'}</li>
          </ul>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("password.new")}</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("password.confirm")}</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          {passwordErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("password.updating")}
              </>
            ) : (
              t("password.button")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
