import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || location.pathname === "/onboarding") {
        setCheckingOnboarding(false);
        return;
      }

      // Quick check: localStorage flag — but only trust it if we also have a selected company
      if (localStorage.getItem("onboarding_completed") === "true" && localStorage.getItem("selectedCompanyId")) {
        setCheckingOnboarding(false);
        return;
      }

      // Check if user has any companies (existing user vs new user)
      try {
        const { count, error } = await supabase
          .from("companies")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!error && (count === null || count === 0)) {
          // Also check company_members in case they're a team member
          const { count: memberCount, error: memberErr } = await supabase
            .from("company_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "active");

          if (!memberErr && (memberCount === null || memberCount === 0)) {
            setNeedsOnboarding(true);
          } else {
            localStorage.setItem("onboarding_completed", "true");
          }
        } else {
          localStorage.setItem("onboarding_completed", "true");
        }
      } catch {
        // On error, skip onboarding to avoid blocking
      }
      setCheckingOnboarding(false);
    };

    if (!loading && user) {
      checkOnboarding();
    } else if (!loading) {
      setCheckingOnboarding(false);
    }
  }, [user, loading, location.pathname]);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
