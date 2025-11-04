import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Company = Tables<"companies">;
type CompanyInsert = TablesInsert<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCompanies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: Omit<CompanyInsert, "user_id">, skipLimitCheck = false) => {
    if (!user) return null;

    // Check company limit if not skipping
    if (!skipLimitCheck) {
      // Get current company count
      const { count, error: countError } = await supabase
        .from("companies")
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error("Error checking company count:", countError);
      } else {
        // Get plan limits
        const { data: limits, error: limitsError } = await supabase
          .rpc('get_user_plan_limits', { user_uuid: user.id })
          .single();

        if (!limitsError && limits) {
          const { max_companies } = limits;
          if (max_companies !== null && (count ?? 0) >= max_companies) {
            const error: any = new Error('Company limit reached');
            error.code = 'LIMIT_REACHED';
            throw error;
          }
        }
      }
    }

    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({ ...companyData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchCompanies();
      
      toast({
        title: "Success",
        description: "Company created successfully"
      });

      return data;
    } catch (error) {
      console.error("Error creating company:", error);
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCompany = async (id: string, updates: CompanyUpdate) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchCompanies();
      
      toast({
        title: "Success",
        description: "Company updated successfully"
      });
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive"
      });
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchCompanies();
      
      toast({
        title: "Success",
        description: "Company deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  return {
    companies,
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    refetch: fetchCompanies
  };
};