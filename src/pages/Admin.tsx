import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { ProductUpdateEmailSection } from "@/components/ProductUpdateEmailSection";
import { ProductUpdateLogsTable } from "@/components/admin/ProductUpdateLogsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { ReceiptScanStatsCard } from "@/components/admin/ReceiptScanStatsCard";
import { PermissionDebugPanel } from "@/components/PermissionDebugPanel";
import { Shield } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";

// Admin access by email
const ADMIN_EMAIL = "martine@3d-art.ca";

export default function Admin() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getEmail = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email || null);
    };
    getEmail();
  }, []);

  const isAdmin = userEmail === ADMIN_EMAIL;

  // Redirect non-admin users
  useEffect(() => {
    if (userEmail !== null && !isAdmin) {
      navigate("/dashboard");
    }
  }, [userEmail, isAdmin, navigate]);

  // Don't render anything if not admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" />
          {language === "fr" ? "Administration" : "Administration"}
        </h1>
        <p className="text-muted-foreground">
          {language === "fr"
            ? "Gérer les fonctionnalités administratives de GestionFlow."
            : "Manage GestionFlow administrative features."}
        </p>
      </div>

      <ReceiptScanStatsCard />

      <UsersTable />

      <ProductUpdateEmailSection />

      <ProductUpdateLogsTable />

      {/* Permission Debug Panel - Admin only */}
      {companies.length > 0 && (
        <PermissionDebugPanel
          companies={companies.map(c => ({ id: c.id, name: c.name }))}
          initialCompanyId={companies[0]?.id}
        />
      )}
    </div>
  );
}
