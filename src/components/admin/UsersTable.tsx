import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Crown, Zap, RefreshCw, Search, Calendar, UserPlus } from "lucide-react";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  plan_type: "free" | "premium" | "pro";
  billing_cycle: "monthly" | "yearly" | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
}

export function UsersTable() {
  const { language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
      plan: "Plan",
      search: "Rechercher par email ou nom...",
      refresh: "Actualiser",
      never: "Jamais",
      noUsers: "Aucun utilisateur trouvé",
      loading: "Chargement...",
      error: "Erreur lors du chargement des utilisateurs",
      new: "Nouveau",
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
      plan: "Plan",
      search: "Search by email or name...",
      refresh: "Refresh",
      never: "Never",
      noUsers: "No users found",
      loading: "Loading...",
      error: "Error loading users",
      new: "New",
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower)
    );
  });

  const sevenDaysAgo = subDays(new Date(), 7);
  const newUsersCount = users.filter((u) => isAfter(new Date(u.created_at), sevenDaysAgo)).length;
  const premiumCount = users.filter((u) => u.plan_type === "premium").length;
  const proCount = users.filter((u) => u.plan_type === "pro").length;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">{t.totalUsers}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <UserPlus className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{newUsersCount}</p>
            <p className="text-xs text-muted-foreground">{t.newThisWeek}</p>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.email}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.registrationDate}</TableHead>
                <TableHead>{t.lastLogin}</TableHead>
                <TableHead>{t.plan}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
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
                      {user.last_sign_in_at
                        ? formatDistanceToNow(new Date(user.last_sign_in_at), {
                            addSuffix: true,
                            locale,
                          })
                        : t.never}
                    </TableCell>
                    <TableCell>{getPlanBadge(user.plan_type)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
