import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserCompanyMembership = {
  company_id: string;
  role_id: string;
  status: string;
  company: {
    id: string;
    name: string;
    user_id: string;
  };
  role: {
    id: string;
    name: string;
  };
};

export function useUserCompanies() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<UserCompanyMembership[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user?.id) {
      setMemberships([]);
      setCompanyIds([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_members")
        .select(`
          company_id,
          role_id,
          status,
          company:companies!inner (
            id,
            name,
            user_id
          ),
          role:company_roles!inner (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      // Transform the data to match our type
      const transformed = (data || []).map((item: any) => ({
        company_id: item.company_id,
        role_id: item.role_id,
        status: item.status,
        company: item.company,
        role: item.role
      }));

      setMemberships(transformed);
      setCompanyIds(transformed.map(m => m.company_id));
    } catch (error) {
      console.error("Error fetching user company memberships:", error);
      setMemberships([]);
      setCompanyIds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  return {
    memberships,
    companyIds,
    loading,
    refetch: fetchMemberships
  };
}
