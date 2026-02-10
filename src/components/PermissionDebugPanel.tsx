import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSION_GROUPS, PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building2,
  Users,
  ChevronsUpDown
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CompanyOption {
  id: string;
  name: string;
}

interface CompanyMember {
  user_id: string;
  role_name: string;
  status: string;
  display_name: string;
  email: string;
}

interface InspectedUserData {
  user_id: string;
  company_id: string;
  role_id: string;
  role_name: string;
  is_system_role: boolean;
  member_status: string;
  permissions: string[];
}

interface PermissionDebugPanelProps {
  companies: CompanyOption[];
  initialCompanyId?: string | null;
  refreshTrigger?: number;
}

export function PermissionDebugPanel({ companies, initialCompanyId, refreshTrigger }: PermissionDebugPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || companies[0]?.id || "");
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || "");
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [inspectedUserData, setInspectedUserData] = useState<InspectedUserData | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  
  // Current user's permissions (to check if they can use debug)
  const { can, abilities, permissions, loading, refetch } = usePermissions(selectedCompanyId || null);
  
  const [testPermission, setTestPermission] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs to track previous values and prevent loops
  const prevCompanyRef = useRef<string | null>(null);
  const prevUserRef = useRef<string | null>(null);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const canDebugPermissions = can(PERMISSIONS.DEBUG_PERMISSIONS_READ);
  const isInspectingSelf = selectedUserId === user?.id;

  // Load company members when company changes or canDebugPermissions becomes true
  useEffect(() => {
    if (!selectedCompanyId || !canDebugPermissions) {
      setCompanyMembers([]);
      return;
    }

    // Skip if company hasn't actually changed and we already have members
    if (prevCompanyRef.current === selectedCompanyId && companyMembers.length > 0) return;
    prevCompanyRef.current = selectedCompanyId;

    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase.rpc("get_company_members_for_debug", {
          _company_id: selectedCompanyId,
        });

        if (error) {
          console.error("Error loading members:", error);
          setCompanyMembers([]);
          return;
        }

        const jsonData = data as unknown as { success?: boolean; members?: CompanyMember[] };
        if (jsonData?.success && jsonData.members) {
          setCompanyMembers(jsonData.members);
          // Default to current user if they're in the list
          const currentUserInList = jsonData.members.find((m: CompanyMember) => m.user_id === user?.id);
          if (currentUserInList) {
            setSelectedUserId(user!.id);
          } else if (jsonData.members.length > 0) {
            setSelectedUserId(jsonData.members[0].user_id);
          }
        }
      } catch (err) {
        console.error("Error loading members:", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [selectedCompanyId, canDebugPermissions, user?.id, companyMembers.length]);

  // Load inspected user's permissions - only when user changes and not self
  const loadUserPermissions = useCallback(async () => {
    if (!selectedCompanyId || !selectedUserId || !canDebugPermissions) return;
    if (isInspectingSelf) return; // Self data is derived, not fetched
    
    setLoadingUserData(true);
    try {
      const { data, error } = await supabase.rpc("get_user_permissions_for_debug", {
        _company_id: selectedCompanyId,
        _target_user_id: selectedUserId,
      });

      if (error) {
        console.error("Error loading user permissions:", error);
        setInspectedUserData(null);
        return;
      }

      const jsonData = data as unknown as InspectedUserData & { success?: boolean; error?: string };
      if (jsonData?.success) {
        setInspectedUserData(jsonData);
      } else {
        console.error("Error from RPC:", jsonData?.error);
        setInspectedUserData(null);
      }
    } catch (err) {
      console.error("Error loading user permissions:", err);
    } finally {
      setLoadingUserData(false);
    }
  }, [selectedCompanyId, selectedUserId, canDebugPermissions, isInspectingSelf]);

  // Trigger load when selected user changes (for non-self users)
  useEffect(() => {
    if (isInspectingSelf) {
      // For self, don't fetch - we'll derive from current permissions
      return;
    }
    
    // Skip if user hasn't actually changed
    if (prevUserRef.current === selectedUserId) return;
    prevUserRef.current = selectedUserId;
    
    loadUserPermissions();
  }, [selectedUserId, isInspectingSelf, loadUserPermissions]);

  // Derive self data from current permissions (memoized to prevent loops)
  const selfInspectedData = useMemo((): InspectedUserData | null => {
    if (!isInspectingSelf || !selectedCompanyId || !user?.id) return null;
    return {
      user_id: user.id,
      company_id: selectedCompanyId,
      role_id: abilities.roleId || "",
      role_name: abilities.roleName || "",
      is_system_role: true,
      member_status: abilities.memberStatus || "",
      permissions: permissions,
    };
  }, [isInspectingSelf, selectedCompanyId, user?.id, abilities.roleId, abilities.roleName, abilities.memberStatus, permissions]);

  // Final inspected data - either self or fetched
  const finalInspectedData = isInspectingSelf ? selfInspectedData : inspectedUserData;

  const handleTestPermission = () => {
    if (!testPermission.trim() || !finalInspectedData) {
      setTestResult(null);
      return;
    }
    // Check if the inspected user has this permission
    const hasPermission = finalInspectedData.permissions.includes(testPermission.trim());
    setTestResult(hasPermission);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    // Re-trigger user data load
    if (!isInspectingSelf && canDebugPermissions) {
      const { data } = await supabase.rpc("get_user_permissions_for_debug", {
        _company_id: selectedCompanyId,
        _target_user_id: selectedUserId,
      });
      const jsonData = data as unknown as InspectedUserData & { success?: boolean };
      if (jsonData?.success) {
        setInspectedUserData(jsonData);
      }
    }
    setIsRefreshing(false);
  };

  const handleCompanyChange = (newCompanyId: string) => {
    prevCompanyRef.current = null; // Reset to force reload
    prevUserRef.current = null;
    setSelectedCompanyId(newCompanyId);
    setTestResult(null);
    setInspectedUserData(null);
    setCompanyMembers([]);
  };

  const handleUserChange = (newUserId: string) => {
    prevUserRef.current = null; // Reset to force reload
    setSelectedUserId(newUserId);
    setTestResult(null);
  };

  const translations = {
    fr: {
      title: "Debug Permissions",
      selectCompany: "Sélectionner une entreprise",
      inspectUser: "Inspecter un utilisateur",
      companyId: "ID Entreprise",
      companyName: "Entreprise",
      userId: "ID Utilisateur",
      userName: "Utilisateur",
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
      noPermission: "Vous n'avez pas la permission de debug",
      self: "(vous)",
    },
    en: {
      title: "Permission Debug",
      selectCompany: "Select a company",
      inspectUser: "Inspect a user",
      companyId: "Company ID",
      companyName: "Company",
      userId: "User ID",
      userName: "User",
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
      noPermission: "You don't have debug permission",
      self: "(you)",
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

  const getSelectedMember = () => companyMembers.find(m => m.user_id === selectedUserId);
  const displayPermissions = finalInspectedData?.permissions || [];
  const displayRoleName = finalInspectedData?.role_name || null;
  const displayMemberStatus = finalInspectedData?.member_status || null;

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

  // Check if user has debug permission
  if (!loading && !canDebugPermissions) {
    return (
      <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Bug className="h-4 w-4" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.noPermission}</p>
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
                {(loading || loadingMembers || loadingUserData) && <span className="text-xs">({t.loading})</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(displayRoleName)}>
                  {displayRoleName || "N/A"}
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

            {/* User Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-3 w-3" />
                {t.inspectUser}
              </Label>
              <Select value={selectedUserId} onValueChange={handleUserChange} disabled={loadingMembers}>
                <SelectTrigger>
                  <SelectValue placeholder={t.inspectUser} />
                </SelectTrigger>
                <SelectContent>
                  {companyMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <span className="flex items-center gap-2">
                        {member.display_name || member.email}
                        <Badge variant="outline" className="text-[10px]">{member.role_name}</Badge>
                        {member.user_id === user?.id && (
                          <span className="text-muted-foreground text-xs">{t.self}</span>
                        )}
                      </span>
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
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {t.userId}
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {selectedUserId}
                </code>
              </div>
              {selectedCompany && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">{t.companyName}</div>
                  <div className="font-medium">{selectedCompany.name}</div>
                </div>
              )}
              {getSelectedMember() && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">{t.userName}</div>
                  <div className="font-medium">{getSelectedMember()?.display_name || getSelectedMember()?.email}</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {t.role}
                </div>
                <Badge variant={getRoleBadgeVariant(displayRoleName)}>
                  {displayRoleName || "N/A"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">{t.memberStatus}</div>
                <Badge variant={displayMemberStatus === "active" ? "default" : "destructive"}>
                  {displayMemberStatus || "N/A"}
                </Badge>
              </div>
            </div>

            {/* Permissions Count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-3 w-3" />
                {t.permissionsCount}: <strong>{displayPermissions.length}</strong>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between font-normal"
                    >
                      {testPermission || t.testPlaceholder}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-50" align="start">
                    <Command>
                      <CommandInput placeholder={language === "fr" ? "Rechercher une permission..." : "Search permission..."} />
                      <CommandList>
                        <CommandEmpty>{language === "fr" ? "Aucune permission trouvée" : "No permission found"}</CommandEmpty>
                        {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                          <CommandGroup key={key} heading={language === "fr" ? group.labelFr : group.labelEn}>
                            {group.permissions.map((p) => (
                              <CommandItem
                                key={p}
                                value={p}
                                onSelect={() => {
                                  setTestPermission(p);
                                  setTestResult(null);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    testPermission === p ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {p}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                {t.rawPermissions} ({displayPermissions.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-32 mt-2">
                  <div className="flex flex-wrap gap-1 p-2 bg-muted rounded">
                    {displayPermissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {displayPermissions.length === 0 && (
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
                          const hasIt = displayPermissions.includes(p);
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
