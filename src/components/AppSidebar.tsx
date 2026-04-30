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
  Crown,
  Lock
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
import { useSubscription, type PlanLimits } from "@/hooks/useSubscription";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import gestionflowLogo from "@/assets/gestionflow-logo.png";
import gestionflowLogoDark from "@/assets/gestionflow-logo-dark.png";
import { useState, useEffect, useMemo } from "react";

type FeatureKey = "category_management" | "quotes_enabled" | "pdf_export" | "all_reports" | "custom_email_templates" | "final_reminder_enabled" | "formal_notice_enabled";

interface MenuItem {
  titleKey: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresFeature: FeatureKey | null;
  requiredPermission: string | null;
  /** Minimum plan required to unlock (used for lock tooltip) */
  minPlan?: "premium" | "pro";
}

/**
 * Checks if a menu item is locked based on the current plan limits.
 * Returns the minimum plan name needed to unlock, or null if accessible.
 */
function getLockedPlan(item: MenuItem, planLimits: PlanLimits | null | undefined): string | null {
  if (!planLimits) return null; // Don't lock while loading
  if (!item.requiresFeature) return null;
  
  const featureAvailable = planLimits[item.requiresFeature];
  if (featureAvailable) return null;
  
  return item.minPlan || "premium";
}

export function AppSidebar() {
  const { t, language } = useLanguage();
  const { user, username } = useAuth();
  const { planLimits } = useSubscription();
  const { hasPermission, loading: permissionsLoading, permissions } = useSelectedCompany();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState("");
  const [requiredPlanName, setRequiredPlanName] = useState("");
  
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

  // Define main menu items with their required permissions and plan features
  const mainItems: MenuItem[] = useMemo(() => [
    { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, requiresFeature: null, requiredPermission: null },
    { titleKey: "nav.companies", url: "/dashboard/companies", icon: Building2, requiresFeature: null, requiredPermission: null },
    { titleKey: "nav.clients", url: "/dashboard/clients", icon: Users, requiresFeature: null, requiredPermission: "clients:view" },
    { titleKey: "nav.categories", url: "/dashboard/categories", icon: Tag, requiresFeature: "category_management", requiredPermission: "settings:view", minPlan: "premium" },
    { titleKey: "nav.products", url: "/dashboard/products", icon: Package, requiresFeature: null, requiredPermission: "products:view" },
    { titleKey: "nav.stockManagement", url: "/dashboard/stock", icon: Warehouse, requiresFeature: "pdf_export", requiredPermission: "inventory:view", minPlan: "premium" },
    { titleKey: "nav.quotes", url: "/dashboard/quotes", icon: FileCheck, requiresFeature: "quotes_enabled", requiredPermission: "quotes:view", minPlan: "premium" },
    { titleKey: "nav.invoices", url: "/dashboard/invoices", icon: FileText, requiresFeature: null, requiredPermission: "invoices:view" },
    { titleKey: "nav.timeTracking", url: "/dashboard/time-tracking", icon: Clock, requiresFeature: null, requiredPermission: "time_tracking:view_own" },
    { titleKey: "nav.expenses", url: "/dashboard/expenses", icon: Receipt, requiresFeature: null, requiredPermission: "expenses:view" },
    { titleKey: "nav.reports", url: "/dashboard/reports", icon: BarChart3, requiresFeature: null, requiredPermission: "reports:view" },
  ], []);

  // Filter menu items based on permissions (but keep plan-locked items visible)
  const permissionsReady = !permissionsLoading && permissions.length > 0;
  const visibleMainItems = mainItems.filter(item => {
    if (!item.requiredPermission) return true;
    if (!permissionsReady) return true;
    // Always show plan-gated items (even if permission missing, they'll show as locked)
    if (item.requiresFeature && getLockedPlan(item, planLimits)) return true;
    return hasPermission(item.requiredPermission);
  });

  const settingsItems = [
    { titleKey: "nav.pricing", url: "/dashboard/pricing", icon: Crown, requiresFeature: null, adminOnly: false, requiredPermission: "settings:view" },
    { titleKey: "nav.settings", url: "/dashboard/settings", icon: Settings, requiresFeature: null, adminOnly: false, requiredPermission: "settings:view" },
  ];

  const visibleSettingsItems = settingsItems.filter(item => {
    if (item.requiredPermission) {
      if (!permissionsReady) return true;
      return hasPermission(item.requiredPermission);
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string, isLocked: boolean) => {
    const base = isActive(path) ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";
    return isLocked ? `${base} opacity-60` : base;
  };

  const handleNavClick = (item: MenuItem, e: React.MouseEvent) => {
    const lockedPlan = getLockedPlan(item, planLimits);
    
    if (lockedPlan) {
      e.preventDefault();
      setLockedFeatureName(t(item.titleKey));
      setRequiredPlanName(lockedPlan === "pro" ? "Pro" : "Premium");
      setShowUpgradeDialog(true);
      return;
    }
    
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSettingsNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const upgradeDialogText = useMemo(() => ({
    title: language === 'fr' ? 'Fonctionnalité verrouillée' : 'Locked Feature',
    description: language === 'fr'
      ? `"${lockedFeatureName}" est disponible avec le plan ${requiredPlanName} ou supérieur. Passez à un plan supérieur pour débloquer cette fonctionnalité.`
      : `"${lockedFeatureName}" is available with the ${requiredPlanName} plan or higher. Upgrade your plan to unlock this feature.`,
    cancel: language === 'fr' ? 'Annuler' : 'Cancel',
    upgrade: language === 'fr' ? 'Voir les plans' : 'View Plans',
  }), [language, lockedFeatureName, requiredPlanName]);

  const lockTooltipText = (planName: string) => 
    language === 'fr' 
      ? `Disponible avec le plan ${planName}` 
      : `Available in ${planName} plan`;

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
                <TooltipProvider delayDuration={300}>
                  {visibleMainItems.map((item) => {
                    const lockedPlan = getLockedPlan(item, planLimits);
                    const isLocked = !!lockedPlan;
                    const planLabel = lockedPlan === "pro" ? "Pro" : "Premium";

                    const navContent = (
                      <NavLink 
                        to={item.url} 
                        className={`${getNavCls(item.url, isLocked)} !grid !gap-0 w-full h-9 items-center`}
                        style={{ gridTemplateColumns: isCollapsed ? '24px' : '24px 1fr 20px' }}
                        onClick={(e) => handleNavClick(item, e)}
                      >
                        <span className="flex items-center justify-center w-[24px] h-[24px]">
                          <item.icon className="!h-[18px] !w-[18px]" />
                        </span>
                        {!isCollapsed && (
                          <>
                            <span className="truncate pl-2 text-sm">{t(item.titleKey)}</span>
                            <span className="flex items-center justify-center w-[20px] h-[20px]">
                              <Lock className={`!h-3 !w-3 text-muted-foreground/60 ${isLocked ? 'visible' : 'invisible'}`} />
                            </span>
                          </>
                        )}
                      </NavLink>
                    );

                    return (
                      <SidebarMenuItem key={item.titleKey}>
                        <SidebarMenuButton asChild>
                          {isLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {navContent}
                              </TooltipTrigger>
                              <TooltipContent side="right" className="flex items-center gap-1.5">
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                <span>{lockTooltipText(planLabel)}</span>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            navContent
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.system")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`${getNavCls(item.url, false)} !grid !gap-0 w-full h-9 items-center`}
                        style={{ gridTemplateColumns: isCollapsed ? '24px' : '24px 1fr 20px' }}
                        onClick={handleSettingsNavClick}
                      >
                        <span className="flex items-center justify-center w-[24px] h-[24px]">
                          <item.icon className="!h-[18px] !w-[18px]" />
                        </span>
                        {!isCollapsed && (
                          <>
                            <span className="truncate pl-2 text-sm">{t(item.titleKey)}</span>
                            <span className="w-[20px] h-[20px]" />
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>
                {upgradeDialogText.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {upgradeDialogText.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {upgradeDialogText.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/dashboard/pricing')}>
              {upgradeDialogText.upgrade}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
