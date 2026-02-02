import React, { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/hooks/useLanguage";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bug, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  RefreshCw,
  Shield,
  User,
  Building2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CompanyOption {
  id: string;
  name: string;
}

interface PermissionDebugPanelProps {
  companies: CompanyOption[];
  initialCompanyId?: string | null;
}

export function PermissionDebugPanel({ companies, initialCompanyId }: PermissionDebugPanelProps) {
  const { language } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || companies[0]?.id || "");
  
  const { 
    can, 
    abilities, 
    permissions, 
    loading, 
    refetch 
  } = usePermissions(selectedCompanyId || null);
  
  const [testPermission, setTestPermission] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleTestPermission = () => {
    if (!testPermission.trim()) {
      setTestResult(null);
      return;
    }
    setTestResult(can(testPermission.trim()));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleCompanyChange = (newCompanyId: string) => {
    setSelectedCompanyId(newCompanyId);
    setTestResult(null);
  };

  const translations = {
    fr: {
      title: "Debug Permissions",
      selectCompany: "Sélectionner une entreprise",
      companyId: "ID Entreprise",
      companyName: "Entreprise",
      role: "Rôle détecté",
      memberStatus: "Statut membre",
      permissionsCount: "Permissions",
      testPermission: "Tester une permission",
      testPlaceholder: "ex: expenses:create",
      test: "Tester",
      result: "Résultat",
      allowed: "Autorisé",
      denied: "Refusé",
      refresh: "Rafraîchir",
      loading: "Chargement...",
      rawPermissions: "Permissions brutes",
      permissionGroups: "Groupes de permissions",
      noCompany: "Aucune entreprise disponible",
    },
    en: {
      title: "Permission Debug",
      selectCompany: "Select a company",
      companyId: "Company ID",
      companyName: "Company",
      role: "Detected Role",
      memberStatus: "Member Status",
      permissionsCount: "Permissions",
      testPermission: "Test a permission",
      testPlaceholder: "e.g. expenses:create",
      test: "Test",
      result: "Result",
      allowed: "Allowed",
      denied: "Denied",
      refresh: "Refresh",
      loading: "Loading...",
      rawPermissions: "Raw Permissions",
      permissionGroups: "Permission Groups",
      noCompany: "No company available",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const getRoleBadgeVariant = (roleName: string | null) => {
    switch (roleName) {
      case "Owner": return "default";
      case "Admin": return "secondary";
      default: return "outline";
    }
  };

  if (companies.length === 0) {
    return (
      <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Bug className="h-4 w-4" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.noCompany}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                {t.title}
                {loading && <span className="text-xs">({t.loading})</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(abilities.roleName)}>
                  {abilities.roleName || "N/A"}
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Company Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.selectCompany}</Label>
              <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectCompany} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Context Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {t.companyId}
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {selectedCompanyId}
                </code>
              </div>
              {selectedCompany && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">{t.companyName}</div>
                  <div className="font-medium">{selectedCompany.name}</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {t.role}
                </div>
                <Badge variant={getRoleBadgeVariant(abilities.roleName)}>
                  {abilities.roleName || "N/A"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">{t.memberStatus}</div>
                <Badge variant={abilities.isMember ? "default" : "destructive"}>
                  {abilities.memberStatus || "N/A"}
                </Badge>
              </div>
            </div>

            {/* Permissions Count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-3 w-3" />
                {t.permissionsCount}: <strong>{permissions.length}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                {t.refresh}
              </Button>
            </div>

            {/* Test Permission */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.testPermission}</label>
              <div className="flex gap-2">
                <Input
                  placeholder={t.testPlaceholder}
                  value={testPermission}
                  onChange={(e) => setTestPermission(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTestPermission()}
                  className="flex-1"
                />
                <Button onClick={handleTestPermission} size="sm">
                  {t.test}
                </Button>
              </div>
              {testResult !== null && (
                <div className={`flex items-center gap-2 text-sm ${testResult ? "text-green-600" : "text-red-600"}`}>
                  {testResult ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {t.result}: <strong>{testResult ? t.allowed : t.denied}</strong>
                </div>
              )}
            </div>

            {/* Raw Permissions */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                <ChevronDown className="h-3 w-3" />
                {t.rawPermissions} ({permissions.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-32 mt-2">
                  <div className="flex flex-wrap gap-1 p-2 bg-muted rounded">
                    {permissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {permissions.length === 0 && (
                      <span className="text-xs text-muted-foreground">No permissions</span>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            {/* Permission Groups Check */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                <ChevronDown className="h-3 w-3" />
                {t.permissionGroups}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                    <div key={key} className="text-xs">
                      <div className="font-medium">
                        {language === "fr" ? group.labelFr : group.labelEn}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.permissions.map((p) => {
                          const hasIt = can(p);
                          return (
                            <Badge
                              key={p}
                              variant={hasIt ? "default" : "outline"}
                              className={`text-[10px] ${!hasIt && "opacity-50"}`}
                            >
                              {hasIt ? <Check className="h-2 w-2 mr-1" /> : <X className="h-2 w-2 mr-1" />}
                              {p.split(":")[1]}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
