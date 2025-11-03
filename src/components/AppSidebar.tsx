
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  Package,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  ChevronDown
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import gestionflowLogo from "@/assets/gestionflow-logo.png";

export function AppSidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const loadUsername = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data?.username) {
          setUsername(data.username);
        } else {
          setUsername(user.email?.split("@")[0] || "User");
        }
      } catch (error) {
        console.error("Error loading username:", error);
        setUsername(user.email?.split("@")[0] || "User");
      }
    };

    loadUsername();
  }, [user]);

  const mainItems = [
    { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
    { titleKey: "nav.companies", url: "/dashboard/companies", icon: Building2 },
    { titleKey: "nav.clients", url: "/dashboard/clients", icon: Users },
    { titleKey: "nav.categories", url: "/dashboard/categories", icon: Tag },
    { titleKey: "nav.products", url: "/dashboard/products", icon: Package },
    { titleKey: "nav.invoices", url: "/dashboard/invoices", icon: FileText },
    { titleKey: "nav.expenses", url: "/dashboard/expenses", icon: Receipt },
    { titleKey: "nav.reports", url: "/dashboard/reports", icon: BarChart3 },
  ];

  const settingsItems = [
    { titleKey: "nav.settings", url: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path) ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex flex-col items-center gap-2">
            <img src={gestionflowLogo} alt="GestionFlow" className={`${isCollapsed ? "w-20 h-20" : "w-32 h-32"} object-contain`} />
            {!isCollapsed && (
              <h2 className="font-bold text-base text-center">
                {username || t("nav.title")}
              </h2>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
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
                    <NavLink to={item.url} className={getNavCls(item.url)}>
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
  );
}
