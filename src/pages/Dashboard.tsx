
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Package, FileText, DollarSign, TrendingUp } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useDashboard();

  const stats = [
    {
      title: "Total Revenue",
      value: isLoading ? "Loading..." : `$${dashboardData?.totalRevenue.toLocaleString() || "0"}`,
      description: "From paid invoices",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Active Clients",
      value: isLoading ? "Loading..." : (dashboardData?.activeClients || 0).toString(),
      description: `+${dashboardData?.newClientsThisMonth || 0} new this month`,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Open Invoices",
      value: isLoading ? "Loading..." : (dashboardData?.openInvoicesCount || 0).toString(),
      description: `Total: $${dashboardData?.openInvoicesTotal.toLocaleString() || "0"}`,
      icon: FileText,
      color: "text-orange-600"
    },
    {
      title: "Products/Services",
      value: isLoading ? "Loading..." : (dashboardData?.activeProducts || 0).toString(),
      description: "Active products",
      icon: Package,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest transactions and updates
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
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <button className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Create New Invoice</span>
              </button>
              <button className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                <Users className="h-4 w-4" />
                <span className="text-sm">Add New Client</span>
              </button>
              <button className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                <Package className="h-4 w-4" />
                <span className="text-sm">Add Product/Service</span>
              </button>
              <button className="flex items-center justify-start space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">View Reports</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
