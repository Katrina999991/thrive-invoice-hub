
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
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
    { titleKey: "nav.dashboard", url: "/", icon: LayoutDashboard },
    { titleKey: "nav.companies", url: "/companies", icon: Building2 },
    { titleKey: "nav.clients", url: "/clients", icon: Users },
    { titleKey: "nav.products", url: "/products", icon: Package },
    { titleKey: "nav.invoices", url: "/invoices", icon: FileText },
    { titleKey: "nav.expenses", url: "/expenses", icon: Receipt },
    { titleKey: "nav.reports", url: "/reports", icon: BarChart3 },
  ];

  const settingsItems = [
    { titleKey: "nav.settings", url: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
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
        <div className="p-4">
          <h2 className={`font-bold text-lg ${isCollapsed ? "hidden" : "block"}`}>
            {username || t("nav.title")}
          </h2>
          {isCollapsed && <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">{username ? username[0].toUpperCase() : "B"}</div>}
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
