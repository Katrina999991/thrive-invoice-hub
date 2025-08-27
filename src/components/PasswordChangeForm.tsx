
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { updatePassword } = useAuth();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Votre mot de passe a été modifié avec succès.",
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
          Changer le mot de passe
        </CardTitle>
        <CardDescription>
          Modifiez votre mot de passe pour sécuriser votre compte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Modification en cours...
              </>
            ) : (
              "Changer le mot de passe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
