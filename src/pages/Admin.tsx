import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { ProductUpdateEmailSection } from "@/components/ProductUpdateEmailSection";
import { ProductUpdateLogsTable } from "@/components/admin/ProductUpdateLogsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { ReceiptScanStatsCard } from "@/components/admin/ReceiptScanStatsCard";
import { Shield } from "lucide-react";

// Admin user ID - only this user can access admin features
const ADMIN_USER_ID = "e6c5ca56-8437-4782-bc6a-3b0f77993ebc";

export default function Admin() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.id !== ADMIN_USER_ID) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Don't render anything if not admin
  if (!user || user.id !== ADMIN_USER_ID) {
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
    </div>
  );
}
