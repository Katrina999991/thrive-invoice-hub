import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { logAuditEvent, AuditEventCategory } from "@/lib/auditLogger";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Company = Tables<"companies">;
type CompanyInsert = TablesInsert<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;

// Helper to detect what type of settings changed
const detectSettingsChangeType = (updates: CompanyUpdate): { eventType: string; description: string; category: AuditEventCategory } | null => {
  const keys = Object.keys(updates);
  
  // Tax changes
  if (keys.includes('taxes')) {
    return { eventType: 'taxes_updated', description: 'Modification des taxes', category: 'settings' };
  }
  
  // Email template changes
  if (keys.some(k => k.includes('email_subject') || k.includes('email_message'))) {
    return { eventType: 'email_templates_updated', description: 'Modification des modèles de courriel', category: 'settings' };
  }
  
  // Invoice template/branding changes
  if (keys.some(k => k.includes('invoice_body') || k.includes('invoice_footer') || k.includes('logo_url'))) {
    return { eventType: 'document_templates_updated', description: 'Modification des modèles de documents', category: 'settings' };
  }
  
  // Invoice numbering changes
  if (keys.some(k => k.includes('invoice_prefix') || k.includes('invoice_digits') || k.includes('invoice_start'))) {
    return { eventType: 'invoice_numbering_updated', description: 'Modification de la numérotation des factures', category: 'settings' };
  }
  
  return null;
};

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, username } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      // Generate unique invoice prefix if not provided
      let invoicePrefix = companyData.invoice_prefix;
      
      if (!invoicePrefix) {
        // Generate prefix from company name (first 3 letters in uppercase)
        const basePrefix = companyData.name
          .replace(/[^a-zA-Z]/g, '') // Remove non-letters
          .substring(0, 3)
          .toUpperCase() || 'INV';

        // Check if prefix already exists
        const { data: existingCompanies } = await supabase
          .from("companies")
          .select("invoice_prefix")
          .eq("user_id", user.id);

        const existingPrefixes = existingCompanies?.map(c => c.invoice_prefix) || [];
        
        // Find unique prefix
        invoicePrefix = basePrefix;
        let counter = 1;
        while (existingPrefixes.includes(invoicePrefix)) {
          invoicePrefix = `${basePrefix}${counter}`;
          counter++;
        }
      }

      const { data, error } = await supabase
        .from("companies")
        .insert({ 
          ...companyData, 
          user_id: user.id,
          invoice_prefix: invoicePrefix 
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCompanies();
      
      // Invalidate dashboard and plan limits cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
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
    if (!user) return;
    
    // Get company name for logging
    const company = companies.find(c => c.id === id);
    
    try {
      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchCompanies();
      
      // Log audit event for settings changes
      const settingsChange = detectSettingsChangeType(updates);
      if (settingsChange) {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0] || 'User',
          companyId: id,
          category: settingsChange.category,
          eventType: settingsChange.eventType,
          description: `${settingsChange.description} (${company?.name})`,
          relatedEntityType: 'company',
          relatedEntityId: id,
          metadata: { company_name: company?.name, changes: Object.keys(updates) }
        });
      }
      
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
      
      // Invalidate dashboard and plan limits cache
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
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
