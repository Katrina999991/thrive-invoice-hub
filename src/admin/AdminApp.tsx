import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UsersTable } from "@/components/admin/UsersTable";
import { ReceiptScanStatsCard } from "@/components/admin/ReceiptScanStatsCard";
import { ProductUpdateEmailSection } from "@/components/ProductUpdateEmailSection";
import { ProductUpdateLogsTable } from "@/components/admin/ProductUpdateLogsTable";
import { PresenceTracker } from "@/components/PresenceTracker";

const queryClient = new QueryClient();

function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> GestionFlow Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessDenied() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Access denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account does not have administrator privileges.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await signOut();
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-6 justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5" /> GestionFlow Admin
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>
      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground">
            Manage GestionFlow users and platform features.
          </p>
        </div>
        <ReceiptScanStatsCard />
        <UsersTable />
        <ProductUpdateEmailSection />
        <ProductUpdateLogsTable />
      </main>
    </div>
  );
}

function AdminGate() {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      setChecking(true);
      // Server-side admin check (cannot be spoofed from client)
      const { data, error } = await supabase.rpc("is_admin");
      if (cancelled) return;
      if (error) {
        console.error("is_admin RPC failed", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
      setChecking(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || (user && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return <AdminLogin />;
  if (!isAdmin) return <AccessDenied />;
  return <AdminDashboard />;
}

export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <PresenceTracker />
              <Routes>
                <Route path="/" element={<AdminGate />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
