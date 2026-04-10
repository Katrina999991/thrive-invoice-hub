import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";

interface InviteDetails {
  id: string;
  email: string;
  company_name: string;
  role_name: string;
  expires_at: string;
  accepted_at: string | null;
}

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: language === 'fr' ? "Invitation d'équipe" : "Team Invitation",
    loading: language === 'fr' ? "Chargement de l'invitation..." : "Loading invitation...",
    invalidToken: language === 'fr' ? "Lien d'invitation invalide" : "Invalid invitation link",
    inviteNotFound: language === 'fr' ? "Invitation introuvable ou expirée" : "Invitation not found or expired",
    alreadyAccepted: language === 'fr' ? "Cette invitation a déjà été acceptée" : "This invitation has already been accepted",
    expired: language === 'fr' ? "Cette invitation a expiré" : "This invitation has expired",
    emailMismatch: language === 'fr' 
      ? "Cette invitation est destinée à une autre adresse email. Veuillez vous connecter avec l'email correct." 
      : "This invitation is for a different email address. Please sign in with the correct email.",
    youAreInvited: language === 'fr' ? "Vous êtes invité(e) à rejoindre" : "You're invited to join",
    asRole: language === 'fr' ? "en tant que" : "as",
    acceptInvitation: language === 'fr' ? "Accepter l'invitation" : "Accept Invitation",
    accepting: language === 'fr' ? "Acceptation..." : "Accepting...",
    loginFirst: language === 'fr' 
      ? "Connectez-vous ou créez un compte pour accepter cette invitation" 
      : "Sign in or create an account to accept this invitation",
    loginButton: language === 'fr' ? "Se connecter" : "Sign In",
    success: language === 'fr' ? "Invitation acceptée!" : "Invitation accepted!",
    successDesc: language === 'fr' 
      ? "Vous avez rejoint l'équipe avec succès" 
      : "You have successfully joined the team",
    errorAccepting: language === 'fr' ? "Erreur lors de l'acceptation" : "Error accepting invitation",
    goToDashboard: language === 'fr' ? "Aller au tableau de bord" : "Go to Dashboard",
  };

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError(t.invalidToken);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .rpc('get_invite_by_token', { _token: token });

        if (fetchError || !data) {
          setError(t.inviteNotFound);
          setLoading(false);
          return;
        }

        if (data.accepted_at) {
          setError(t.alreadyAccepted);
          setLoading(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError(t.expired);
          setLoading(false);
          return;
        }

        setInvite({
          id: data.id,
          email: data.email,
          company_name: (data.companies as any)?.name || '',
          role_name: (data.company_roles as any)?.name || '',
          expires_at: data.expires_at,
          accepted_at: data.accepted_at,
        });
      } catch (err) {
        console.error("Error fetching invite:", err);
        setError(t.inviteNotFound);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchInvite();
    }
  }, [token, authLoading, t.invalidToken, t.inviteNotFound, t.alreadyAccepted, t.expired]);

  const handleAccept = async () => {
    if (!user || !invite) return;

    // Check email matches
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      toast.error(t.emailMismatch);
      return;
    }

    setAccepting(true);
    try {
      // Get invite details to get company_id and role_id
      const { data: inviteData, error: inviteError } = await supabase
        .from('company_invites')
        .select('company_id, role_id')
        .eq('id', invite.id)
        .single();

      if (inviteError || !inviteData) {
        throw new Error("Could not fetch invite details");
      }

      // Add user to company_members
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          company_id: inviteData.company_id,
          user_id: user.id,
          role_id: inviteData.role_id,
          status: 'active',
        });

      if (memberError) {
        // Check if already a member
        if (memberError.code === '23505') {
          toast.info(language === 'fr' ? "Vous êtes déjà membre de cette entreprise" : "You're already a member of this company");
        } else {
          throw memberError;
        }
      }

      // Mark invite as accepted
      await supabase
        .from('company_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      toast.success(t.success, { description: t.successDesc });
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast.error(t.errorAccepting, { description: err.message });
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    navigate('/auth');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                {language === 'fr' ? "Retour à l'accueil" : "Back to Home"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>
            {t.youAreInvited} <strong>{invite.company_name}</strong> {t.asRole} <strong>{invite.role_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            user.email?.toLowerCase() === invite.email.toLowerCase() ? (
              <Button 
                className="w-full" 
                onClick={handleAccept} 
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.accepting}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t.acceptInvitation}
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-destructive">{t.emailMismatch}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' ? "Email de l'invitation:" : "Invitation email:"} <strong>{invite.email}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' ? "Votre email:" : "Your email:"} <strong>{user.email}</strong>
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">{t.loginFirst}</p>
              <Button className="w-full" onClick={handleLogin}>
                {t.loginButton}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
