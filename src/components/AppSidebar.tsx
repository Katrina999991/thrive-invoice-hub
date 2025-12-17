
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  Package,
  Warehouse,
  FileText,
  FileCheck,
  Clock,
  Receipt,
  BarChart3,
  Settings,
  ChevronDown,
  Crown
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import gestionflowLogo from "@/assets/gestionflow-logo.png";
import gestionflowLogoDark from "@/assets/gestionflow-logo-dark.png";
import { useState, useEffect } from "react";

export function AppSidebar() {
  const { t, language } = useLanguage();
  const { user, username } = useAuth();
  const { planLimits } = useSubscription();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
  const [darkMode, setDarkMode] = useState<string>(
    localStorage.getItem("app-dark-mode") || "light"
  );
  
  useEffect(() => {
    const handleStorageChange = () => {
      setDarkMode(localStorage.getItem("app-dark-mode") || "light");
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const logo = darkMode === "dark" ? gestionflowLogoDark : gestionflowLogo;

  const mainItems = [
    { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, requiresFeature: null },
    { titleKey: "nav.companies", url: "/dashboard/companies", icon: Building2, requiresFeature: null },
    { titleKey: "nav.clients", url: "/dashboard/clients", icon: Users, requiresFeature: null },
    { titleKey: "nav.categories", url: "/dashboard/categories", icon: Tag, requiresFeature: "category_management" as const },
    { titleKey: "nav.products", url: "/dashboard/products", icon: Package, requiresFeature: null },
    { titleKey: "nav.stockManagement", url: "/dashboard/stock", icon: Warehouse, requiresFeature: null },
    { titleKey: "nav.quotes", url: "/dashboard/quotes", icon: FileCheck, requiresFeature: null },
    { titleKey: "nav.invoices", url: "/dashboard/invoices", icon: FileText, requiresFeature: null },
    { titleKey: "nav.timeTracking", url: "/dashboard/time-tracking", icon: Clock, requiresFeature: null },
    { titleKey: "nav.expenses", url: "/dashboard/expenses", icon: Receipt, requiresFeature: null },
    { titleKey: "nav.reports", url: "/dashboard/reports", icon: BarChart3, requiresFeature: null },
  ];

  const settingsItems = [
    { titleKey: "nav.pricing", url: "/dashboard/pricing", icon: Crown, requiresFeature: null },
    { titleKey: "nav.settings", url: "/dashboard/settings", icon: Settings, requiresFeature: null },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path) ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const handleNavClick = (item: typeof mainItems[0], e: React.MouseEvent) => {
    if (item.requiresFeature && planLimits && !planLimits[item.requiresFeature]) {
      e.preventDefault();
      setShowCategoryDialog(true);
      return;
    }
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSettingsNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar
        className={isCollapsed ? "w-14" : "w-60"}
        collapsible="icon"
      >
        <SidebarHeader className="border-b flex-shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <img src={logo} alt="GestionFlow" className={`${isCollapsed ? "w-12 h-12" : "w-24 h-24"} object-contain`} />
            {!isCollapsed && (
              <h2 className="font-bold text-base text-center text-primary -mt-1">
                {username || t("nav.title")}
              </h2>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.main")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavCls(item.url)}
                        onClick={(e) => handleNavClick(item, e)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.system")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavCls(item.url)}
                        onClick={handleSettingsNavClick}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Fonctionnalité Premium' : 'Premium Feature'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? 'La gestion des catégories est disponible avec les plans Premium et Pro. Passez à un plan supérieur pour accéder à cette fonctionnalité.' 
                : 'Category management is available with Premium and Pro plans. Upgrade to access this feature.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/dashboard/pricing')}>
              {language === 'fr' ? 'Voir les plans' : 'View Plans'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
