import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { validatePassword } from "@/lib/passwordValidation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PasswordChangeDialog() {
  const { user, updatePassword, signOut } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("password_change_required")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.password_change_required) {
        setIsOpen(true);
      }
    };

    checkPasswordChangeRequired();
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setPasswordErrors([]);

    if (newPassword !== confirmPassword) {
      setError(language === 'en' ? "Passwords do not match" : "Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    const validation = validatePassword(newPassword, language);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await updatePassword(newPassword);
    
    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    // Mark password change as complete
    await supabase
      .from("profiles")
      .update({ password_change_required: false })
      .eq("user_id", user!.id);

    toast({
      title: language === 'en' ? "Password updated!" : "Mot de passe mis à jour !",
      description: language === 'en' 
        ? "Your password has been successfully updated." 
        : "Votre mot de passe a été mis à jour avec succès.",
    });

    setIsOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Password Update Required' : 'Mise à jour du mot de passe requise'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en' 
              ? 'For security reasons, you must update your password. The new password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.' 
              : 'Pour des raisons de sécurité, vous devez mettre à jour votre mot de passe. Le nouveau mot de passe doit contenir au moins 8 caractères incluant des majuscules, des minuscules, des chiffres et des caractères spéciaux.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">
              {language === 'en' ? 'New Password' : 'Nouveau mot de passe'}
            </Label>
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
            <Label htmlFor="confirm-password">
              {language === 'en' ? 'Confirm Password' : 'Confirmer le mot de passe'}
            </Label>
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="flex-1"
              disabled={isLoading}
            >
              {language === 'en' ? 'Logout' : 'Se déconnecter'}
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'en' ? 'Updating...' : 'Mise à jour...'}
                </>
              ) : (
                language === 'en' ? 'Update Password' : 'Mettre à jour'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
