import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine, TrendingUp, Calendar } from "lucide-react";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";

export function ReceiptScanStatsCard() {
  const { language } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["receipt-scan-stats"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const last30Days = subDays(now, 30).toISOString();

      // Fetch all stats in parallel
      const [totalResult, todayResult, weekResult, monthResult, recentResult] = await Promise.all([
        supabase.from("receipt_scan_logs").select("id", { count: "exact", head: true }),
        supabase.from("receipt_scan_logs").select("id", { count: "exact", head: true }).gte("scanned_at", todayStart),
        supabase.from("receipt_scan_logs").select("id", { count: "exact", head: true }).gte("scanned_at", weekStart),
        supabase.from("receipt_scan_logs").select("id", { count: "exact", head: true }).gte("scanned_at", monthStart),
        supabase.from("receipt_scan_logs").select("*").order("scanned_at", { ascending: false }).limit(10)
      ]);

      return {
        total: totalResult.count || 0,
        today: todayResult.count || 0,
        thisWeek: weekResult.count || 0,
        thisMonth: monthResult.count || 0,
        recentScans: recentResult.data || []
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {language === "fr" ? "Utilisation AI - Scans de reçus" : "AI Usage - Receipt Scans"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          {language === "fr" ? "Utilisation AI - Scans de reçus" : "AI Usage - Receipt Scans"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary">{stats?.total || 0}</div>
            <div className="text-sm text-muted-foreground">
              {language === "fr" ? "Total" : "Total"}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats?.today || 0}</div>
            <div className="text-sm text-muted-foreground">
              {language === "fr" ? "Aujourd'hui" : "Today"}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats?.thisWeek || 0}</div>
            <div className="text-sm text-muted-foreground">
              {language === "fr" ? "Cette semaine" : "This Week"}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{stats?.thisMonth || 0}</div>
            <div className="text-sm text-muted-foreground">
              {language === "fr" ? "Ce mois" : "This Month"}
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        {stats?.recentScans && stats.recentScans.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {language === "fr" ? "Derniers scans" : "Recent Scans"}
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {stats.recentScans.map((scan: any) => (
                <div key={scan.id} className="flex items-center justify-between text-sm py-2 px-3 bg-muted/30 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {format(new Date(scan.scanned_at), "dd/MM HH:mm")}
                    </span>
                    <span className="font-medium truncate max-w-[150px]">
                      {scan.vendor || (language === "fr" ? "Inconnu" : "Unknown")}
                    </span>
                  </div>
                  {scan.total_amount && (
                    <span className="text-muted-foreground">
                      ${Number(scan.total_amount).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t">
          <TrendingUp className="h-3 w-3" />
          {language === "fr" 
            ? "Chaque scan de reçu consomme des crédits AI Lovable"
            : "Each receipt scan consumes Lovable AI credits"}
        </div>
      </CardContent>
    </Card>
  );
}
