import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Crown, Zap, RefreshCw, Search, Calendar, UserPlus, CreditCard, Building2, FileText, Receipt, UserRound, Loader2, KeyRound, Eye, EyeOff, Copy, Check, Send, Activity, Clock, History } from "lucide-react";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Format a timestamp as a human-readable distance from now.
 * Clamps to "now" if the value is in the future (e.g. when the
 * viewer's clock is slightly behind the server clock), so we never
 * show "in 2 minutes" for a Last seen value.
 */
const formatPastDistance = (iso: string, locale: Locale) => {
  const d = new Date(iso);
  const now = new Date();
  const safe = d.getTime() > now.getTime() ? now : d;
  return formatDistanceToNow(safe, { addSuffix: true, locale });
};

/**
 * Format a duration in minutes as a human-readable string.
 * Examples: "0 min", "42 min", "3h 12m", "2j 4h"
 */
const formatSessionDuration = (totalMinutes: number, language: string): string => {
  const m = Math.max(0, Math.floor(totalMinutes || 0));
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const dayLabel = language === "fr" ? "j" : "d";
  return `${days}${dayLabel} ${remHours}h`;
};

interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_seen_at?: string | null;
  total_session_minutes?: number;
  plan_type: "free" | "premium" | "pro";
  billing_cycle: "monthly" | "yearly" | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  // Activation data
  stripe_connected: boolean;
  companies_count: number;
  invoices_count: number;
  quotes_count: number;
  expenses_count: number;
  clients_count: number;
  expenses_by_company?: Array<{ company_id: string | null; company_name: string | null; count: number; orphan?: boolean }>;
  invoices_sent_count?: number;
  invoices_paid_count?: number;
  last_invoice_sent_at?: string | null;
  last_invoice_paid_at?: string | null;
  last_activity_at?: string | null;
}

interface AuditLogEntry {
  id: string;
  created_at: string;
  category: string;
  event_type: string;
  description: string;
}

// Emails to exclude from stats (test/internal accounts)
const EXCLUDED_EMAILS = [
  "app@statis.ca",
  "silviu@theresanaiforthat.com",
  "katrina99999@hotmail.com",
  "md@statis.ca",
  "martine@statis.ca",
  "etiennedupuis1@gmail.com",
  "martine9999931@gmail.com",
  "pass3344@gmail.com",
  "pass3388@gmail.com",
  "martine@3d-art.ca",
  "felimailhot@gmail.com",
];

export function UsersTable() {
  const { language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{ userId: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [storedPasswords, setStoredPasswords] = useState<Record<string, { password: string; updatedAt: string }>>({});
  const [activityUser, setActivityUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const locale = language === "fr" ? fr : enUS;

  const translations = {
    fr: {
      title: "Utilisateurs",
      totalUsers: "Total utilisateurs",
      newThisWeek: "Nouveaux (7 jours)",
      premiumUsers: "Premium",
      proUsers: "Pro",
      email: "Email",
      name: "Nom",
      registrationDate: "Inscription",
      lastLogin: "Dernière connexion",
      lastSeen: "Dernière visite",
      totalSessionTime: "Temps total",
      plan: "Plan",
      activation: "Activité",
      search: "Rechercher par email ou nom...",
      refresh: "Actualiser",
      never: "Jamais",
      noUsers: "Aucun utilisateur trouvé",
      loading: "Chargement...",
      error: "Erreur lors du chargement des utilisateurs",
      new: "Nouveau",
      active: "Actif",
      stripeConnected: "Stripe connecté",
      stripeNotConnected: "Stripe non connecté",
      companies: "Entreprises",
      clients: "Clients",
      hasInvoices: "A créé des factures",
      noInvoices: "Aucune facture",
      hasQuotes: "A créé des devis",
      noQuotes: "Aucun devis",
      hasExpenses: "A créé des dépenses",
      noExpenses: "Aucune dépense",
      hasClients: "A créé des clients",
      noClients: "Aucun client",
      activeUsers: "Utilisateurs actifs",
      invoicesSent: "Factures envoyées",
      invoicesPaid: "Factures payées",
      lastActivity: "Dernière activité",
      lastInvoiceSent: "Dernière facture envoyée",
      noActivity: "Aucune activité",
      activityActive: "Active",
      activityWarm: "Modérée",
      activityInactive: "Inactive",
      viewActivity: "Voir l'activité",
      activityHistory: "Historique d'activité",
      noActivityLogs: "Aucune activité enregistrée",
      stripe: "Stripe Connect",
    },
    en: {
      title: "Users",
      totalUsers: "Total users",
      newThisWeek: "New (7 days)",
      premiumUsers: "Premium",
      proUsers: "Pro",
      email: "Email",
      name: "Name",
      registrationDate: "Registration",
      lastLogin: "Last login",
      lastSeen: "Last seen",
      totalSessionTime: "Total time",
      plan: "Plan",
      activation: "Activity",
      search: "Search by email or name...",
      refresh: "Refresh",
      never: "Never",
      noUsers: "No users found",
      loading: "Loading...",
      error: "Error loading users",
      new: "New",
      active: "Active",
      stripeConnected: "Stripe connected",
      stripeNotConnected: "Stripe not connected",
      companies: "Companies",
      clients: "Clients",
      hasInvoices: "Has created invoices",
      noInvoices: "No invoices",
      hasQuotes: "Has created quotes",
      noQuotes: "No quotes",
      hasExpenses: "Has created expenses",
      noExpenses: "No expenses",
      hasClients: "Has created clients",
      noClients: "No clients",
      activeUsers: "Active users",
      invoicesSent: "Sent invoices",
      invoicesPaid: "Paid invoices",
      lastActivity: "Last activity",
      lastInvoiceSent: "Last invoice sent",
      noActivity: "No activity",
      activityActive: "Active",
      activityWarm: "Warm",
      activityInactive: "Inactive",
      viewActivity: "View activity",
      activityHistory: "Activity history",
      noActivityLogs: "No activity recorded",
      stripe: "Stripe Connect",
    },
  };

  const t = translations[language];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No session");
      }

      const { data, error: fnError } = await supabase.functions.invoke("get-all-users", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStoredPasswords = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data, error } = await supabase.functions.invoke("admin-reset-password?action=get-passwords", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        method: "GET",
      });
      if (!error && data?.passwords) {
        const map: Record<string, { password: string; updatedAt: string }> = {};
        for (const p of data.passwords) {
          map[p.user_id] = { password: p.password_plain, updatedAt: p.updated_at };
        }
        setStoredPasswords(map);
      }
    } catch { /* silently fail */ }
  };

  const handlePlanChange = async (userId: string, newPlan: string) => {
    setUpdatingPlan(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("No session");

      const { data, error: fnError } = await supabase.functions.invoke("update-user-plan", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { userId, planType: newPlan },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan_type: newPlan as User["plan_type"] } : u))
      );
      toast.success(language === "fr" ? "Plan mis à jour" : "Plan updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setUpdatingPlan(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordDialog || !newPassword) return;
    setSavingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("No session");

      const { data, error: fnError } = await supabase.functions.invoke("admin-reset-password", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { userId: passwordDialog.userId, newPassword, email: passwordDialog.email },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Update local stored passwords cache
      setStoredPasswords((prev) => ({
        ...prev,
        [passwordDialog.userId]: { password: newPassword, updatedAt: new Date().toISOString() },
      }));

      toast.success(language === "fr" ? "Mot de passe mis à jour" : "Password updated");
      setPasswordDialog(null);
      setNewPassword("");
      setShowPassword(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  useEffect(() => {
    fetchUsers();
    fetchStoredPasswords();
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.email?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower)) &&
      !EXCLUDED_EMAILS.includes(user.email?.toLowerCase() || "")
    );
  });

  const filteredTestUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.email?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower)) &&
      EXCLUDED_EMAILS.includes(user.email?.toLowerCase() || "")
    );
  });

  // Filter out excluded emails for stats calculations
  const usersForStats = users.filter((u) => !EXCLUDED_EMAILS.includes(u.email?.toLowerCase() || ""));
  
  const sevenDaysAgo = subDays(new Date(), 7);
  const newUsersCount = usersForStats.filter((u) => isAfter(new Date(u.created_at), sevenDaysAgo)).length;
  const premiumCount = usersForStats.filter((u) => u.plan_type === "premium").length;
  const proCount = usersForStats.filter((u) => u.plan_type === "pro").length;
  const activeUsersCount = usersForStats.filter((u) => u.invoices_count > 0 || u.quotes_count > 0 || u.expenses_count > 0).length;

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "pro":
        return (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Zap className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        );
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const isNewUser = (createdAt: string) => {
    return isAfter(new Date(createdAt), sevenDaysAgo);
  };

  // Helper to get count-based styling
  const getCountStyle = (count: number) => {
    if (count === 0) return 'bg-muted text-muted-foreground';
    if (count <= 5) return 'bg-blue-500/20 text-blue-600';
    return 'bg-emerald-500/20 text-emerald-600';
  };

  // Activity badge logic
  const getActivityStatus = (lastActivityAt: string | null | undefined) => {
    if (!lastActivityAt) return { key: 'none', label: t.noActivity, className: 'bg-muted text-muted-foreground border-transparent' };
    const days = (Date.now() - new Date(lastActivityAt).getTime()) / 86400000;
    if (days <= 3) return { key: 'active', label: t.activityActive, className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
    if (days <= 10) return { key: 'warm', label: t.activityWarm, className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
    return { key: 'inactive', label: t.activityInactive, className: 'bg-rose-500/15 text-rose-600 border-rose-500/30' };
  };

  const renderCount = (n: number) => (n > 0 ? n.toString() : '—');

  const openActivityDrawer = async (user: User) => {
    setActivityUser(user);
    setActivityLogs([]);
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, category, event_type, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setActivityLogs((data || []) as AuditLogEntry[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading activity');
    } finally {
      setLoadingActivity(false);
    }
  };

  const renderActivityCell = (user: User) => {
    const status = getActivityStatus(user.last_activity_at);
    const sentCount = user.invoices_sent_count ?? 0;
    const paidCount = user.invoices_paid_count ?? 0;
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col gap-1.5 min-w-[260px]">
          {/* Top row: badge + last activity + view button */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={`text-xs gap-1 ${status.className}`}>
              <Activity className="h-3 w-3" />
              {status.label}
            </Badge>
            <div className="flex items-center gap-1">
              {user.last_activity_at && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(user.last_activity_at), { addSuffix: true, locale })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.lastActivity}: {format(new Date(user.last_activity_at), 'PPpp', { locale })}
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openActivityDrawer(user)}>
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.viewActivity}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* Counters row */}
          <div className="flex items-center flex-wrap gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${user.stripe_connected ? 'bg-purple-500/20 text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                  <CreditCard className="h-3 w-3" />
                  {user.stripe_connected ? '✓' : '✕'}
                </span>
              </TooltipTrigger>
              <TooltipContent>{user.stripe_connected ? t.stripeConnected : t.stripeNotConnected}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${user.companies_count === 0 ? 'bg-muted text-muted-foreground' : user.companies_count === 1 ? 'bg-blue-500/20 text-blue-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
                  <Building2 className="h-3 w-3" />
                  {renderCount(user.companies_count)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.companies}: {user.companies_count}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(user.invoices_count)}`}>
                  <FileText className="h-3 w-3" />
                  {renderCount(user.invoices_count)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.hasInvoices}: {user.invoices_count}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(sentCount)}`}>
                  <Send className="h-3 w-3" />
                  {renderCount(sentCount)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t.invoicesSent}: {sentCount}
                {user.last_invoice_sent_at && (
                  <div className="text-xs opacity-80 mt-0.5">
                    {t.lastInvoiceSent}: {format(new Date(user.last_invoice_sent_at), 'PP', { locale })}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(paidCount)}`}>
                  <Check className="h-3 w-3" />
                  {renderCount(paidCount)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.invoicesPaid}: {paidCount}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(user.quotes_count)}`}>
                  <Receipt className="h-3 w-3" />
                  {renderCount(user.quotes_count)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.hasQuotes}: {user.quotes_count}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(user.expenses_count)}`}>
                  <Receipt className="h-3 w-3" />
                  {renderCount(user.expenses_count)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <div className="font-medium">{t.hasExpenses}: {user.expenses_count}</div>
                  <div className="text-[10px] opacity-70">
                    {language === "fr" ? "créées par l'utilisateur (toutes compagnies)" : "created by user (all companies)"}
                  </div>
                  {user.expenses_by_company && user.expenses_by_company.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {user.expenses_by_company
                        .slice()
                        .sort((a, b) => {
                          // Orphan row always last
                          if (a.orphan && !b.orphan) return 1;
                          if (!a.orphan && b.orphan) return -1;
                          return b.count - a.count;
                        })
                        .map((row, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 text-xs">
                            <span>
                              {row.orphan
                                ? (language === "fr" ? "Autres compagnies (accès retiré)" : "Other companies (access removed)")
                                : (row.company_name || (language === "fr" ? "Sans compagnie" : "No company"))}
                            </span>
                            <span className="font-mono">{row.count}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center justify-center min-w-8 h-6 px-1.5 rounded text-xs font-semibold gap-1 ${getCountStyle(user.clients_count)}`}>
                  <UserRound className="h-3 w-3" />
                  {renderCount(user.clients_count)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.hasClients}: {user.clients_count}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{t.error}: {error}</p>
          <Button onClick={fetchUsers} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.refresh}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{usersForStats.length}</p>
              <p className="text-xs text-muted-foreground">{t.totalUsers}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <UserPlus className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{newUsersCount}</p>
              <p className="text-xs text-muted-foreground">{t.newThisWeek}</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{activeUsersCount}</p>
              <p className="text-xs text-muted-foreground">{t.activeUsers}</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{premiumCount}</p>
              <p className="text-xs text-muted-foreground">{t.premiumUsers}</p>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-4 text-center">
              <Crown className="h-5 w-5 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{proCount}</p>
              <p className="text-xs text-muted-foreground">{t.proUsers}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.email}</TableHead>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.registrationDate}</TableHead>
                  <TableHead>{t.lastLogin}</TableHead>
                  <TableHead>{t.lastSeen}</TableHead>
                  <TableHead>{t.totalSessionTime}</TableHead>
                  <TableHead>{t.plan}</TableHead>
                  <TableHead className="text-center">{t.activation}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 && filteredTestUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t.noUsers}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.display_name || "-"}
                            {isNewUser(user.created_at) && (
                              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                {t.new}
                              </Badge>
                            )}
                            {(user.invoices_count > 0 || user.quotes_count > 0 || user.expenses_count > 0) && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                                {t.active}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span title={format(new Date(user.created_at), "PPpp", { locale })}>
                              {format(new Date(user.created_at), "PP", { locale })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? formatPastDistance(user.last_sign_in_at, locale) : t.never}
                        </TableCell>
                        <TableCell>
                          {user.last_seen_at ? formatPastDistance(user.last_seen_at, locale) : t.never}
                        </TableCell>
                        <TableCell>
                          {formatSessionDuration(user.total_session_minutes || 0, language)}
                        </TableCell>
                        <TableCell>{getPlanBadge(user.plan_type)}</TableCell>
                        <TableCell>{renderActivityCell(user)}</TableCell>
                      </TableRow>
                    ))}

                    {/* Separator + Test/Internal users */}
                    {filteredTestUsers.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/50 py-2 text-center">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {language === "fr" ? "Comptes test / internes" : "Test / Internal accounts"}
                              {" "}({filteredTestUsers.length})
                            </span>
                          </TableCell>
                        </TableRow>
                        {filteredTestUsers.map((user) => (
                          <TableRow key={user.id} className="opacity-60">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {user.email}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setPasswordDialog({ userId: user.id, email: user.email });
                                    setNewPassword("");
                                    setShowPassword(false);
                                  }}
                                  title={language === "fr" ? "Changer le mot de passe" : "Change password"}
                                >
                                  <KeyRound className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {user.display_name || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span title={format(new Date(user.created_at), "PPpp", { locale })}>
                                  {format(new Date(user.created_at), "PP", { locale })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.last_sign_in_at ? formatPastDistance(user.last_sign_in_at, locale) : t.never}
                            </TableCell>
                            <TableCell>
                              {user.last_seen_at ? formatPastDistance(user.last_seen_at, locale) : t.never}
                            </TableCell>
                            <TableCell>
                              {formatSessionDuration(user.total_session_minutes || 0, language)}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.plan_type}
                                onValueChange={(val) => handlePlanChange(user.id, val)}
                                disabled={updatingPlan === user.id}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  {updatingPlan === user.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="premium">
                                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Premium</span>
                                  </SelectItem>
                                  <SelectItem value="pro">
                                    <span className="flex items-center gap-1"><Crown className="h-3 w-3" /> Pro</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {renderActivityCell(user)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setNewPassword(""); setShowPassword(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {language === "fr" ? "Changer le mot de passe" : "Change password"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{passwordDialog?.email}</p>

            {/* Show stored password if available */}
            {passwordDialog && storedPasswords[passwordDialog.userId] && (
              <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {language === "fr" ? "Mot de passe actuel enregistré :" : "Current stored password:"}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background px-2 py-1 rounded">
                    {storedPasswords[passwordDialog.userId].password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      navigator.clipboard.writeText(storedPasswords[passwordDialog.userId].password);
                      toast.success(language === "fr" ? "Copié !" : "Copied!");
                    }}
                    title={language === "fr" ? "Copier" : "Copy"}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Modifié" : "Updated"}{" "}
                  {formatDistanceToNow(new Date(storedPasswords[passwordDialog.userId].updatedAt), { addSuffix: true, locale })}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {language === "fr" ? "Nouveau mot de passe :" : "New password:"}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={language === "fr" ? "Nouveau mot de passe" : "New password"}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  disabled={!newPassword}
                  title={language === "fr" ? "Copier" : "Copy"}
                >
                  {copiedPassword ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
                  const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                  setNewPassword(pwd);
                  setShowPassword(true);
                }}
              >
                {language === "fr" ? "Générer un mot de passe" : "Generate password"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordDialog(null); setNewPassword(""); }}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handlePasswordChange} disabled={!newPassword || newPassword.length < 6 || savingPassword}>
              {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === "fr" ? "Enregistrer" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity History Dialog */}
      <Dialog open={!!activityUser} onOpenChange={(open) => { if (!open) { setActivityUser(null); setActivityLogs([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t.activityHistory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{activityUser?.email}</p>
            {activityUser?.last_activity_at && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t.lastActivity}: {format(new Date(activityUser.last_activity_at), 'PPpp', { locale })}
              </div>
            )}
            <div className="border rounded-md max-h-[400px] overflow-y-auto divide-y">
              {loadingActivity ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t.noActivityLogs}</div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{log.event_type}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
