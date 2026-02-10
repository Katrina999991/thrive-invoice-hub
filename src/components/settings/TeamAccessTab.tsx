import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, UserPlus, Shield, Mail, Trash2, Copy, Edit2, Loader2, Clock, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyPermissions } from "@/hooks/useCompanyPermissions";
import { useCompanyMembers, type CompanyRole } from "@/hooks/useCompanyMembers";
import { useCompanyRoles, ALL_PERMISSIONS, PERMISSION_MODULES } from "@/hooks/useCompanyRoles";
import { PermissionDebugPanel } from "@/components/PermissionDebugPanel";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export function TeamAccessTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { companies } = useCompanies();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  
  // Role management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showDeleteRoleDialog, setShowDeleteRoleDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CompanyRole | null>(null);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [debugPanelKey, setDebugPanelKey] = useState(0);

  const { hasPermission, loading: permissionsLoading } = useCompanyPermissions(selectedCompanyId);
  const { members, roles, invites, loading: membersLoading, updateMemberRole, removeMember, inviteMember, cancelInvite, refetch } = useCompanyMembers(selectedCompanyId);
  const { rolePermissions, loading: rolesLoading, fetchRolePermissions, createRole, updateRole, deleteRole, setPermissions, duplicateRole } = useCompanyRoles(selectedCompanyId);

  const canViewMembers = hasPermission("access:view_members");
  const canInvite = hasPermission("access:invite");
  const canRemove = hasPermission("access:remove");
  const canManageRoles = hasPermission("access:manage_roles");
  
  // Check if current user is Owner of selected company
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role_name === "Owner";
  
  // Admins can manage custom roles but NOT system roles (Owner, Admin)
  const canEditSystemRoles = isOwner;

  // Set first company as default
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Set default invite role
  useEffect(() => {
    if (roles.length > 0 && !inviteRoleId) {
      const viewerRole = roles.find(r => r.name === "Viewer");
      setInviteRoleId(viewerRole?.id || roles[0].id);
    }
  }, [roles, inviteRoleId]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRoleId || !user?.id) return;
    
    setIsInviting(true);
    await inviteMember(inviteEmail, inviteRoleId, user.id);
    setInviteEmail("");
    setIsInviting(false);
  };

  const handleEditRole = async (role: CompanyRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    const perms = await fetchRolePermissions(role.id);
    setSelectedPermissions(perms);
    setShowRoleDialog(true);
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setShowRoleDialog(true);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) return;

    if (editingRole) {
      // For system roles, only update permissions (don't try to rename)
      if (!editingRole.is_system) {
        await updateRole(editingRole.id, roleName, roleDescription);
      }
      await setPermissions(editingRole.id, selectedPermissions);
    } else {
      const newRole = await createRole(roleName, roleDescription);
      if (newRole) {
        await setPermissions(newRole.id, selectedPermissions);
      }
    }

    setShowRoleDialog(false);
    // Re-fetch permissions for the edited/created role so the permission group display updates
    if (editingRole) {
      fetchRolePermissions(editingRole.id);
    }
    setDebugPanelKey(prev => prev + 1);
    refetch();
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    await deleteRole(roleToDelete.id);
    setShowDeleteRoleDialog(false);
    setRoleToDelete(null);
    refetch();
  };

  const handleDuplicateRole = async (role: CompanyRole) => {
    const newName = `${role.name} (${language === "fr" ? "copie" : "copy"})`;
    await duplicateRole(role.id, newName);
    refetch();
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember(memberToRemove);
    setShowRemoveMemberDialog(false);
    setMemberToRemove(null);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = ALL_PERMISSIONS.filter(p => p.module === module).map(p => p.key);
    const allSelected = modulePerms.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, { en: string; fr: string }> = {
      clients: { en: "Clients", fr: "Clients" },
      companies: { en: "Companies", fr: "Entreprises" },
      invoices: { en: "Invoices", fr: "Factures" },
      quotes: { en: "Quotes", fr: "Devis" },
      expenses: { en: "Expenses", fr: "Dépenses" },
      products: { en: "Products", fr: "Produits" },
      inventory: { en: "Inventory", fr: "Inventaire" },
      time_tracking: { en: "Time Tracking", fr: "Suivi du temps" },
      reports: { en: "Reports", fr: "Rapports" },
      settings: { en: "Settings", fr: "Paramètres" },
      access: { en: "Access", fr: "Accès" },
      billing: { en: "Billing", fr: "Facturation" }
    };
    return labels[module]?.[language] || module;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { en: string; fr: string }> = {
      view: { en: "View", fr: "Voir" },
      view_own: { en: "View own", fr: "Voir les siens" },
      view_all: { en: "View all", fr: "Voir tout" },
      create: { en: "Create", fr: "Créer" },
      create_own: { en: "Create own", fr: "Créer les siens" },
      edit: { en: "Edit", fr: "Modifier" },
      edit_own: { en: "Edit own", fr: "Modifier les siens" },
      edit_all: { en: "Edit all", fr: "Modifier tout" },
      delete: { en: "Delete", fr: "Supprimer" },
      delete_own: { en: "Delete own", fr: "Supprimer les siens" },
      delete_all: { en: "Delete all", fr: "Supprimer tout" },
      send: { en: "Send", fr: "Envoyer" },
      approve: { en: "Approve", fr: "Approuver" },
      adjust: { en: "Adjust", fr: "Ajuster" },
      export: { en: "Export", fr: "Exporter" },
      mark_as_billed: { en: "Mark as billed", fr: "Marquer comme facturé" },
      link_to_invoice: { en: "Link to invoice", fr: "Lier à une facture" },
      view_members: { en: "View members", fr: "Voir les membres" },
      invite: { en: "Invite", fr: "Inviter" },
      remove: { en: "Remove", fr: "Retirer" },
      manage_roles: { en: "Manage roles", fr: "Gérer les rôles" },
      manage: { en: "Manage", fr: "Gérer" }
    };
    return labels[action]?.[language] || action;
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canViewMembers) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {language === "fr" ? "Accès refusé" : "Access denied"}
            </p>
            <p className="text-sm mt-2">
              {language === "fr" 
                ? "Vous n'avez pas la permission de voir les membres de l'équipe."
                : "You don't have permission to view team members."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === "fr" ? "Équipe & Accès" : "Team & Access"}
          </CardTitle>
          <CardDescription>
            {language === "fr" 
              ? "Gérez les membres de votre équipe et leurs permissions"
              : "Manage your team members and their permissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>{language === "fr" ? "Sélectionner l'entreprise" : "Select Company"}</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder={language === "fr" ? "Choisir une entreprise" : "Choose a company"} />
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
        </CardContent>
      </Card>

      {selectedCompanyId && (
        <>
          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {language === "fr" ? "Membres" : "Members"}
                <Badge variant="secondary" className="ml-2">{members.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {language === "fr" ? "Aucun membre" : "No members"}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "fr" ? "Membre" : "Member"}</TableHead>
                      <TableHead>{language === "fr" ? "Rôle" : "Role"}</TableHead>
                      <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                      <TableHead>{language === "fr" ? "Depuis" : "Since"}</TableHead>
                      {canRemove && <TableHead className="w-[100px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.user_id === user?.id ? (
                            <span className="flex items-center gap-2">
                              {member.user_display_name || member.user_email || member.user_id.slice(0, 8)}
                              <Badge variant="outline" className="text-xs">
                                {language === "fr" ? "Vous" : "You"}
                              </Badge>
                            </span>
                          ) : (
                            member.user_display_name || member.user_email || member.user_id.slice(0, 8)
                          )}
                        </TableCell>
                        <TableCell>
                          {canManageRoles && member.user_id !== user?.id && member.role_name !== "Owner" ? (
                            <Select 
                              value={member.role_id} 
                              onValueChange={(value) => updateMemberRole(member.id, value)}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.filter(role => role.name !== "Owner").map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">{member.role_name}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.status === "active" ? "default" : "destructive"}>
                            {member.status === "active" 
                              ? (language === "fr" ? "Actif" : "Active")
                              : (language === "fr" ? "Suspendu" : "Suspended")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(member.created_at), { 
                            addSuffix: true,
                            locale: language === "fr" ? fr : enUS
                          })}
                        </TableCell>
                        {canRemove && (
                          <TableCell>
                            {member.user_id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setMemberToRemove(member.id);
                                  setShowRemoveMemberDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Invite Members */}
          {canInvite && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {language === "fr" ? "Inviter un membre" : "Invite a member"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="invite-email">{language === "fr" ? "Email" : "Email"}</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder={language === "fr" ? "email@exemple.com" : "email@example.com"}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="w-[180px]">
                    <Label>{language === "fr" ? "Rôle" : "Role"}</Label>
                    <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.filter(role => role.name !== "Owner").map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleInvite} disabled={!inviteEmail || !inviteRoleId || isInviting}>
                      {isInviting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      {language === "fr" ? "Inviter" : "Invite"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {language === "fr" ? "Invitations en attente" : "Pending Invitations"}
                  <Badge variant="secondary">{invites.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "fr" ? "Email" : "Email"}</TableHead>
                      <TableHead>{language === "fr" ? "Rôle" : "Role"}</TableHead>
                      <TableHead>{language === "fr" ? "Expire" : "Expires"}</TableHead>
                      {canInvite && <TableHead className="w-[100px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{invite.role_name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(invite.expires_at), "PPP", { 
                            locale: language === "fr" ? fr : enUS 
                          })}
                        </TableCell>
                        {canInvite && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelInvite(invite.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Roles Management */}
          {canManageRoles && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {language === "fr" ? "Rôles & Permissions" : "Roles & Permissions"}
                  </span>
                  <Button onClick={handleCreateRole} size="sm">
                    {language === "fr" ? "Nouveau rôle" : "New role"}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {language === "fr" 
                    ? "Créez et gérez les rôles avec leurs permissions"
                    : "Create and manage roles with their permissions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {roles.map((role) => (
                    <AccordionItem key={role.id} value={role.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>{role.name}</span>
                          {role.is_system && (
                            <Badge variant="outline" className="text-xs">
                              {language === "fr" ? "Système" : "System"}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                        <div className="flex gap-2">
                            {/* Show edit/delete only for non-system roles, OR for system roles (except Owner) if user is Owner */}
                            {(!role.is_system || (canEditSystemRoles && role.name !== "Owner")) && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  {language === "fr" ? "Modifier" : "Edit"}
                                </Button>
                                {!role.is_system && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setRoleToDelete(role);
                                      setShowDeleteRoleDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {language === "fr" ? "Supprimer" : "Delete"}
                                  </Button>
                                )}
                              </>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDuplicateRole(role)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {language === "fr" ? "Dupliquer" : "Duplicate"}
                            </Button>
                          </div>
                          <div className="rounded-lg border p-4 mt-4">
                            <p className="text-sm font-medium mb-2">
                              {language === "fr" ? "Permissions" : "Permissions"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {rolePermissions[role.id]?.map((perm) => (
                                <Badge key={perm} variant="secondary" className="text-xs">
                                  {perm}
                                </Badge>
                              )) || (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => fetchRolePermissions(role.id)}
                                >
                                  {language === "fr" ? "Charger les permissions" : "Load permissions"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Role Edit/Create Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole 
                ? (language === "fr" ? "Modifier le rôle" : "Edit role")
                : (language === "fr" ? "Nouveau rôle" : "New role")}
            </DialogTitle>
            <DialogDescription>
              {editingRole?.is_system && !canEditSystemRoles ? (
                <span className="text-amber-600">
                  {language === "fr" 
                    ? "Les permissions des rôles système ne peuvent être modifiées que par le propriétaire."
                    : "System role permissions can only be modified by the owner."}
                </span>
              ) : (
                language === "fr" 
                  ? "Définissez le nom et les permissions du rôle"
                  : "Define the role name and permissions"
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">{language === "fr" ? "Nom du rôle" : "Role name"}</Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder={language === "fr" ? "Ex: Gestionnaire" : "Ex: Manager"}
                disabled={editingRole?.is_system && !canEditSystemRoles}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">{language === "fr" ? "Description" : "Description"}</Label>
              <Input
                id="role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder={language === "fr" ? "Description optionnelle" : "Optional description"}
                disabled={editingRole?.is_system && !canEditSystemRoles}
              />
            </div>

            <div className="space-y-4">
              <Label>{language === "fr" ? "Permissions" : "Permissions"}</Label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                {PERMISSION_MODULES.map((module) => {
                  const modulePerms = ALL_PERMISSIONS.filter(p => p.module === module);
                  const allSelected = modulePerms.every(p => selectedPermissions.includes(p.key));
                  const someSelected = modulePerms.some(p => selectedPermissions.includes(p.key));
                  const isDisabled = editingRole?.is_system && !canEditSystemRoles;
                  return (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`module-${module}`}
                          checked={allSelected}
                          onCheckedChange={() => toggleModulePermissions(module)}
                          className={someSelected && !allSelected ? "opacity-50" : ""}
                          disabled={isDisabled}
                        />
                        <Label 
                          htmlFor={`module-${module}`} 
                          className={`font-medium ${isDisabled ? "text-muted-foreground" : "cursor-pointer"}`}
                        >
                          {getModuleLabel(module)}
                        </Label>
                      </div>
                      <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {modulePerms.map((perm) => (
                          <div key={perm.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={perm.key}
                              checked={selectedPermissions.includes(perm.key)}
                              onCheckedChange={() => togglePermission(perm.key)}
                              disabled={isDisabled}
                            />
                            <Label 
                              htmlFor={perm.key} 
                              className={`text-sm ${isDisabled ? "text-muted-foreground/50" : "cursor-pointer text-muted-foreground"}`}
                            >
                              {getActionLabel(perm.action)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handleSaveRole} disabled={!roleName.trim() || rolesLoading}>
              {rolesLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === "fr" ? "Sauvegarder" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={showDeleteRoleDialog} onOpenChange={setShowDeleteRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Supprimer le rôle" : "Delete role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? `Êtes-vous sûr de vouloir supprimer le rôle "${roleToDelete?.name}" ? Cette action est irréversible.`
                : `Are you sure you want to delete the role "${roleToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground">
              {language === "fr" ? "Supprimer" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Retirer le membre" : "Remove member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Êtes-vous sûr de vouloir retirer ce membre de l'entreprise ?"
                : "Are you sure you want to remove this member from the company?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground">
              {language === "fr" ? "Retirer" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permission Debug Panel - For Owners/Admins */}
      {(isOwner || canManageRoles) && companies.length > 0 && (
        <PermissionDebugPanel 
          companies={companies.map(c => ({ id: c.id, name: c.name }))}
          initialCompanyId={selectedCompanyId}
        />
      )}
    </div>
  );
}
