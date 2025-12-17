import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuditLogs, categoryTranslations, eventTypeTranslations, AuditEventCategory } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CalendarIcon, Search, Shield, Lock, FileText, Package, Download, Settings, Filter, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function AuditLogs() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { planLimits } = useSubscription();
  
  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<AuditEventCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { auditLogs, isLoading, hasAccess, historyDays } = useAuditLogs({
    startDate,
    endDate,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    searchQuery,
  });

  const dateLocale = language === "fr" ? fr : enUS;

  const getCategoryIcon = (category: AuditEventCategory) => {
    switch (category) {
      case 'authentication':
        return <Shield className="h-4 w-4" />;
      case 'billing':
        return <Lock className="h-4 w-4" />;
      case 'sales':
        return <FileText className="h-4 w-4" />;
      case 'products':
        return <Package className="h-4 w-4" />;
      case 'exports':
        return <Download className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: AuditEventCategory) => {
    switch (category) {
      case 'authentication':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'billing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'sales':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'products':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'exports':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'settings':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const translation = eventTypeTranslations[eventType];
    if (translation) {
      return language === "fr" ? translation.fr : translation.en;
    }
    return eventType.replace(/_/g, ' ');
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const hasFilters = startDate || endDate || selectedCategory !== "all" || searchQuery;

  // No access view for free plan
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {language === "fr" ? "Audit Logs" : "Audit Logs"}
            </CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Historique des actions importantes effectuées dans votre compte."
                : "History of important actions performed in your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === "fr" 
                  ? "Fonctionnalité non disponible"
                  : "Feature not available"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {language === "fr" 
                  ? "Les audit logs sont disponibles avec les plans Premium et Pro. Mettez à niveau votre abonnement pour accéder à l'historique de vos actions."
                  : "Audit logs are available with Premium and Pro plans. Upgrade your subscription to access your action history."}
              </p>
              <Button onClick={() => navigate("/pricing")}>
                {language === "fr" ? "Voir les plans" : "View plans"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {language === "fr" ? "Audit Logs" : "Audit Logs"}
              </CardTitle>
              <CardDescription>
                {language === "fr" 
                  ? "Ces journaux enregistrent les actions importantes effectuées dans votre compte."
                  : "These logs record important actions performed in your account."}
              </CardDescription>
            </div>
            {historyDays !== null && (
              <Badge variant="outline" className="flex items-center gap-1 whitespace-nowrap">
                <AlertTriangle className="h-3 w-3" />
                {language === "fr" 
                  ? `Historique limité à ${historyDays} jours`
                  : `History limited to ${historyDays} days`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === "fr" ? "Rechercher..." : "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <Select 
                value={selectedCategory} 
                onValueChange={(value) => setSelectedCategory(value as AuditEventCategory | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={language === "fr" ? "Catégorie" : "Category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "fr" ? "Toutes les catégories" : "All categories"}
                  </SelectItem>
                  {(Object.keys(categoryTranslations) as AuditEventCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {language === "fr" ? categoryTranslations[cat].fr : categoryTranslations[cat].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP", { locale: dateLocale }) : (language === "fr" ? "Date début" : "Start date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={dateLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP", { locale: dateLocale }) : (language === "fr" ? "Date fin" : "End date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={dateLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === "fr" ? "Aucune activité à afficher" : "No activity to display"}
              </h3>
              <p className="text-muted-foreground">
                {hasFilters
                  ? (language === "fr" 
                      ? "Aucun résultat ne correspond à vos filtres."
                      : "No results match your filters.")
                  : (language === "fr"
                      ? "Les actions importantes apparaîtront ici."
                      : "Important actions will appear here.")}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-full",
                      getCategoryColor(log.category)
                    )}>
                      {getCategoryIcon(log.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {getEventTypeLabel(log.event_type)}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", getCategoryColor(log.category))}>
                          {language === "fr" 
                            ? categoryTranslations[log.category].fr 
                            : categoryTranslations[log.category].en}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.description}
                      </p>
                      {log.user_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === "fr" ? "Par" : "By"}: {log.user_name}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      <div>{format(new Date(log.created_at), "PP", { locale: dateLocale })}</div>
                      <div className="text-xs">{format(new Date(log.created_at), "p", { locale: dateLocale })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Results count */}
          {!isLoading && auditLogs.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              {language === "fr" 
                ? `${auditLogs.length} événement${auditLogs.length > 1 ? 's' : ''}`
                : `${auditLogs.length} event${auditLogs.length > 1 ? 's' : ''}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
