import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export default function Auth() {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(false);
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();

  console.log("Auth component render - searchParams:", Object.fromEntries(searchParams));
  console.log("Auth component render - user:", user);
  console.log("Auth component render - showUpdatePassword:", showUpdatePassword);
  console.log("Auth component render - isPasswordRecoveryMode:", isPasswordRecoveryMode);

  // Handle redirects in useEffect, not during render
  useEffect(() => {
    if (user && !isPasswordRecoveryMode && !showUpdatePassword) {
      console.log("Redirecting to / because user exists and not in recovery mode");
      navigate("/");
    }
  }, [user, isPasswordRecoveryMode, showUpdatePassword, navigate]);

  // Check for password recovery from email link
  useEffect(() => {
    console.log("useEffect running - checking for recovery");
    
    const checkForRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session check:", session);
      
      // Only treat as recovery if explicitly from a recovery link
      const isRecovery = searchParams.get('type') === 'recovery';
      if (session?.user && isRecovery) {
        console.log("Recovery detected from URL parameter");
        setIsPasswordRecoveryMode(true);
        setShowUpdatePassword(true);
      }
    };

    checkForRecovery();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session exists:", !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("PASSWORD_RECOVERY event detected");
        setIsPasswordRecoveryMode(true);
        setShowUpdatePassword(true);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only treat as recovery if explicitly from a recovery link
        const isRecovery = searchParams.get('type') === 'recovery';
        
        if (isRecovery) {
          console.log("Recovery sign-in detected");
          setIsPasswordRecoveryMode(true);
          setShowUpdatePassword(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate("/");
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!displayName.trim()) {
      setError("Display name is required");
      setIsLoading(false);
      return;
    }

    // Get current language from localStorage
    const currentLanguage = localStorage.getItem('language') || 'fr';
    
    const { error } = await signUp(email, password, displayName, currentLanguage);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      // Mark that user has signed up successfully
      localStorage.setItem('has_logged_in_before', 'true');
      // Reset form
      setEmail("");
      setPassword("");
      setDisplayName("");
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset email sent!",
        description: "Please check your email for reset instructions.",
      });
      setShowResetPassword(false);
      setResetEmail("");
    }
    
    setIsLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated!",
        description: "Your password has been successfully updated.",
      });
      setShowUpdatePassword(false);
      setIsPasswordRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      // Mark that user has logged in normally
      localStorage.setItem('has_logged_in_before', 'true');
      navigate("/");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <Button
                variant={language === 'fr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('fr')}
              >
                🇫🇷 FR
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                🇬🇧 EN
              </Button>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">GestionFlow</CardTitle>
          <CardDescription className="text-center">
            {language === 'en' 
              ? 'Sign in to your account or create a new one'
              : 'Connectez-vous à votre compte ou créez-en un nouveau'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">
                {language === 'en' ? 'Sign In' : 'Connexion'}
              </TabsTrigger>
              <TabsTrigger value="signup">
                {language === 'en' ? 'Sign Up' : 'Inscription'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">
                    {language === 'en' ? 'Password' : 'Mot de passe'}
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'en' ? 'Signing in...' : 'Connexion en cours...'}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      {language === 'en' ? 'Sign In' : 'Se connecter'}
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {language === 'en' ? 'Forgot your password?' : 'Mot de passe oublié ?'}
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">
                    {language === 'en' ? 'Display Name' : 'Nom d\'affichage'}
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    {language === 'en' ? 'Password' : 'Mot de passe'}
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'en' ? 'Creating account...' : 'Création du compte...'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {language === 'en' ? 'Create Account' : 'Créer un compte'}
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Reset Password' : 'Réinitialiser le mot de passe'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en'
                ? "Enter your email address and we'll send you a link to reset your password."
                : 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder={language === 'en' ? 'Enter your email address' : 'Entrez votre adresse email'}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetPassword(false)}
                className="flex-1"
                disabled={isLoading}
              >
                {language === 'en' ? 'Cancel' : 'Annuler'}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'en' ? 'Sending...' : 'Envoi...'}
                  </>
                ) : (
                  language === 'en' ? 'Send Reset Link' : 'Envoyer le lien'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdatePassword} onOpenChange={setShowUpdatePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Update Password' : 'Modifier le mot de passe'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Enter your new password below.' : 'Entrez votre nouveau mot de passe ci-dessous.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {language === 'en' ? 'New Password' : 'Nouveau mot de passe'}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                placeholder={language === 'en' ? 'Enter your new password' : 'Entrez votre nouveau mot de passe'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {language === 'en' ? 'Confirm Password' : 'Confirmer le mot de passe'}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                placeholder={language === 'en' ? 'Confirm your new password' : 'Confirmez votre nouveau mot de passe'}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'en' ? 'Updating...' : 'Modification...'}
                </>
              ) : (
                language === 'en' ? 'Update Password' : 'Modifier le mot de passe'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}