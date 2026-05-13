import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  status: "active" | "suspended";
  created_at: string;
  user_email?: string;
  user_display_name?: string;
  role_name?: string;
}

export interface CompanyRole {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface CompanyInvite {
  id: string;
  company_id: string;
  email: string;
  role_id: string;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  role_name?: string;
}

export function useCompanyMembers(companyId: string | null) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("company_members")
        .select("*")
        .eq("company_id", companyId);

      if (membersError) throw membersError;

      // Fetch roles for this company
      const { data: rolesData, error: rolesError } = await supabase
        .from("company_roles")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (rolesError) throw rolesError;

      setRoles(rolesData || []);

      // Fetch profiles for all member user_ids
      const userIds = (membersData || []).map(m => m.user_id);
      let profilesMap: Record<string, { display_name?: string; username?: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .rpc("get_member_display_info", { _user_ids: userIds });

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { display_name: p.display_name, username: p.username };
            return acc;
          }, {} as Record<string, { display_name?: string; username?: string }>);
        }
      }

      // Map role names and display names to members
      const membersWithRoles = (membersData || []).map(member => {
        const profile = profilesMap[member.user_id];
        return {
          ...member,
          role_name: rolesData?.find(r => r.id === member.role_id)?.name || "Unknown",
          user_display_name: profile?.display_name || profile?.username || null
        };
      });

      setMembers(membersWithRoles);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchInvites = useCallback(async () => {
    if (!companyId) {
      setInvites([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_invites")
        .select("*")
        .eq("company_id", companyId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;

      // Map role names to invites
      const invitesWithRoles = (data || []).map(invite => ({
        ...invite,
        role_name: roles.find(r => r.id === invite.role_id)?.name || "Unknown"
      }));

      setInvites(invitesWithRoles);
    } catch (error) {
      console.error("Error fetching invites:", error);
    }
  }, [companyId, roles]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (roles.length > 0) {
      fetchInvites();
    }
  }, [fetchInvites, roles]);

  const updateMemberRole = async (memberId: string, newRoleId: string) => {
    try {
      const { error } = await supabase
        .from("company_members")
        .update({ role_id: newRoleId })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Rôle mis à jour" : "Role updated",
        description: language === "fr" 
          ? "Le rôle du membre a été mis à jour avec succès."
          : "Member role has been updated successfully."
      });

      await fetchMembers();
    } catch (error: any) {
      console.error("Error updating member role:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("company_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Membre retiré" : "Member removed",
        description: language === "fr" 
          ? "Le membre a été retiré de l'entreprise."
          : "Member has been removed from the company."
      });

      await fetchMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const inviteMember = async (email: string, roleId: string, invitedBy: string) => {
    if (!companyId) return;

    try {
      // Use RPC function to bypass RLS issues
      const { data: inviteData, error } = await supabase.rpc('create_company_invite', {
        _company_id: companyId,
        _email: email,
        _role_id: roleId,
        _invited_by: invitedBy
      });

      if (error) throw error;

      const inviteResult = inviteData as Record<string, any> | null;

      // Send invite email
      if (inviteResult?.id) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
            body: { inviteId: inviteResult.id }
          });
          
          if (emailError) {
            console.error("Error sending invite email:", emailError);
            toast({
              title: language === "fr" ? "Invitation créée" : "Invitation created",
              description: language === "fr" 
                ? `L'invitation a été créée mais l'email n'a pas pu être envoyé. Partagez le lien manuellement.`
                : `Invitation created but email could not be sent. Please share the link manually.`,
              variant: "destructive"
            });
          } else {
            toast({
              title: language === "fr" ? "Invitation envoyée" : "Invitation sent",
              description: language === "fr" 
                ? `Une invitation a été envoyée à ${email}.`
                : `An invitation has been sent to ${email}.`
            });
          }
        } catch (emailError) {
          console.error("Error invoking send-invite-email:", emailError);
          toast({
            title: language === "fr" ? "Invitation créée" : "Invitation created",
            description: language === "fr" 
              ? `L'invitation a été créée. L'email sera envoyé bientôt.`
              : `Invitation created. Email will be sent shortly.`
          });
        }
      }

      await fetchInvites();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("company_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Invitation annulée" : "Invitation cancelled",
        description: language === "fr" 
          ? "L'invitation a été annulée."
          : "The invitation has been cancelled."
      });

      await fetchInvites();
    } catch (error: any) {
      console.error("Error cancelling invite:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    members,
    roles,
    invites,
    loading,
    updateMemberRole,
    removeMember,
    inviteMember,
    cancelInvite,
    refetch: fetchMembers,
    refetchInvites: fetchInvites
  };
}
