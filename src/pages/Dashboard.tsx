
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Package, FileText, DollarSign, TrendingUp } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { SubscriptionLimitsCard } from "@/components/SubscriptionLimitsCard";
import { GestionFlowFeeBanner } from "@/components/GestionFlowFeeBanner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, Legend } from "recharts";

const STATUS_COLORS = ["#94a3b8", "#3b82f6", "#22c55e", "#f97316"];

const Dashboard = () => {
  const { t } = useLanguage();
  const { data: dashboardData, isLoading } = useDashboard(t);
  const navigate = useNavigate();

  const stats = [
    {
      titleKey: "dashboard.totalRevenue",
      value: isLoading ? t("dashboard.loading") : `$${dashboardData?.totalRevenue.toLocaleString() || "0"}`,
      descriptionKey: "dashboard.totalRevenue.desc",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      titleKey: "dashboard.activeClients",
      value: isLoading ? t("dashboard.loading") : (dashboardData?.activeClients || 0).toString(),
      description: `+${dashboardData?.newClientsThisMonth || 0} ${t("dashboard.newThisMonth")}`,
      icon: Users,
      color: "text-blue-600"
    },
    {
      titleKey: "dashboard.openInvoices",
      value: isLoading ? t("dashboard.loading") : (dashboardData?.openInvoicesCount || 0).toString(),
      description: `${t("dashboard.total")}: $${dashboardData?.openInvoicesTotal.toLocaleString() || "0"}`,
      icon: FileText,
      color: "text-orange-600"
    },
    {
      titleKey: "dashboard.productsServices",
      value: isLoading ? t("dashboard.loading") : (dashboardData?.activeProducts || 0).toString(),
      descriptionKey: "dashboard.activeProducts",
      icon: Package,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>
      <GestionFlowFeeBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.titleKey}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t(stat.titleKey)}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description || (stat.descriptionKey ? t(stat.descriptionKey) : "")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.revenueByMonth")}</CardTitle>
            <CardDescription>{t("dashboard.revenueByMonth.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto" style={{ height: 260 }}>
                <BarChart width={480} height={240} data={dashboardData?.monthlyRevenue || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => "$" + value} />
                  <ChartTooltip formatter={(value) => ["$" + Number(value).toLocaleString(), t("dashboard.revenue")]} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.invoiceStatus")}</CardTitle>
            <CardDescription>{t("dashboard.invoiceStatus.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto" style={{ height: 260 }}>
                <PieChart width={480} height={240}>
                  <Pie
                    data={dashboardData?.invoiceStatusCounts || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="48%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(dashboardData?.invoiceStatusCounts || []).map((entry, index) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value, name) => [value, t("dashboard.status." + name)]} />
                  <Legend formatter={(value) => t("dashboard.status." + value)} />
                </PieChart>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SubscriptionLimitsCard />
        
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            <CardDescription>
              {t("dashboard.recentActivity.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                </div>
              ) : dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.color === 'green' ? 'bg-green-500' :
                      activity.color === 'blue' ? 'bg-blue-500' :
                      activity.color === 'orange' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                    </div>
                    {activity.amount && (
                      <div className={`text-sm font-medium ${
                        activity.color === 'green' ? 'text-green-600' :
                        activity.color === 'orange' ? 'text-orange-600' :
                        'text-muted-foreground'
                      }`}>
                        {activity.amount}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>
              {t("dashboard.quickActions.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <button 
                onClick={() => navigate("/dashboard/invoices")}
                className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">{t("dashboard.createInvoice")}</span>
              </button>
              <button 
                onClick={() => navigate("/dashboard/clients")}
                className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm">{t("dashboard.addClient")}</span>
              </button>
              <button 
                onClick={() => navigate("/dashboard/products")}
                className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Package className="h-4 w-4" />
                <span className="text-sm">{t("dashboard.addProduct")}</span>
              </button>
              <button 
                onClick={() => navigate("/dashboard/reports")}
                className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{t("dashboard.viewReports")}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
