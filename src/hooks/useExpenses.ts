import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Expense = Tables<"expenses"> & {
  companies?: { name: string } | null;
  profiles?: { username: string | null; display_name: string | null } | null;
};
type ExpenseInsert = TablesInsert<"expenses">;
type ExpenseUpdate = TablesUpdate<"expenses">;

interface UseExpensesOptions {
  showArchived?: boolean;
  companyId?: string | null;
  permissions?: string[];
}

export const useExpenses = (showArchivedOrOptions: boolean | UseExpensesOptions = false) => {
  // Handle both old signature (boolean) and new signature (options object)
  const options: UseExpensesOptions = typeof showArchivedOrOptions === 'boolean' 
    ? { showArchived: showArchivedOrOptions }
    : showArchivedOrOptions;
  
  const { showArchived = false, companyId, permissions = [] } = options;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, username } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission checks
  const canViewAll = useMemo(() => 
    permissions.includes("expenses:view_all") || permissions.includes("expenses:view"),
    [permissions]
  );
  
  const canEditAll = useMemo(() => 
    permissions.includes("expenses:edit_all") || permissions.includes("expenses:edit"),
    [permissions]
  );
  
  const canDelete = useMemo(() => 
    permissions.includes("expenses:delete"),
    [permissions]
  );

  const fetchExpenses = useCallback(async () => {
    if (!user) return;

    try {
      // First get companies where user is a member
      const { data: memberCompanyIds, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const memberCompanyIdList = memberCompanyIds?.map(m => m.company_id) || [];
      
      // Use all member companies for fetching expenses
      // The UI filter will handle showing/hiding based on company selection
      const targetCompanyIds = memberCompanyIdList;

      let data: Expense[] = [];
      
      if (targetCompanyIds.length > 0) {
        // Build query based on permissions
        let query = supabase
          .from("expenses")
          .select(`
            *,
            companies (
              name
            )
          `)
          .in("company_id", targetCompanyIds)
          .eq("is_archived", showArchived)
          .order("expense_date", { ascending: false });

        // If user can only view their own expenses, filter by user_id
        if (!canViewAll) {
          query = query.eq("user_id", user.id);
        }

        const { data: expensesData, error } = await query;

        if (error) throw error;
        
        // Also fetch legacy expenses (company_id is NULL) owned by user
        // This ensures backward compatibility with expenses created before company system
        const { data: legacyExpenses, error: legacyError } = await supabase
          .from("expenses")
          .select(`
            *,
            companies (
              name
            )
          `)
          .is("company_id", null)
          .eq("user_id", user.id)
          .eq("is_archived", showArchived)
          .order("expense_date", { ascending: false });

        if (legacyError) throw legacyError;
        
        // Combine company expenses and legacy expenses
        const allExpenses = [...(expensesData || []), ...(legacyExpenses || [])];
        
        // Fetch profiles for the expenses
        const userIds = [...new Set(allExpenses.map(e => e.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.user_id, p])
        );
        
        data = allExpenses.map(expense => ({
          ...expense,
          profiles: profilesMap.get(expense.user_id) || null
        })) as Expense[];
        
        // Sort by expense_date descending
        data.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
      } else {
        // Fallback: get expenses owned by user (for users not in any company)
        const { data: ownedExpenses, error } = await supabase
          .from("expenses")
          .select(`
            *,
            companies (
              name
            )
          `)
          .eq("user_id", user.id)
          .eq("is_archived", showArchived)
          .order("expense_date", { ascending: false });

        if (error) throw error;
        
        // Fetch profile for current user
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .eq("user_id", user.id)
          .single();
        
        data = (ownedExpenses || []).map(expense => ({
          ...expense,
          profiles: profileData || null
        })) as Expense[];
      }
      
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, showArchived, companyId, canViewAll, toast]);

  // Check if user can edit a specific expense
  const canEditExpense = useCallback((expense: Expense): boolean => {
    if (!user) return false;
    if (canEditAll) return true;
    // Can only edit own expenses
    return expense.user_id === user.id && permissions.includes("expenses:edit_own");
  }, [user, canEditAll, permissions]);

  // Check if user can delete a specific expense
  const canDeleteExpense = useCallback((expense: Expense): boolean => {
    if (!user) return false;
    return canDelete;
  }, [user, canDelete]);

  const createExpense = async (expenseData: Omit<ExpenseInsert, "user_id">, skipLimitCheck = false) => {
    if (!user) return null;

    // Check expense limit if not skipping
    if (!skipLimitCheck) {
      const { data: limits, error: limitsError } = await supabase
        .rpc('get_user_plan_limits', { user_uuid: user.id })
        .single();

      if (limitsError) {
        console.error("Error checking limits:", limitsError);
      } else if (limits) {
        const { max_expenses_per_month, expenses_used } = limits;
        if (max_expenses_per_month !== null && expenses_used >= max_expenses_per_month) {
          const error: any = new Error('Monthly expense limit reached');
          error.code = 'LIMIT_REACHED';
          throw error;
        }
      }
    }

    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expenseData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchExpenses();
      
      // Invalider le cache des limites et du dashboard pour mettre à jour le compteur
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'expense_created',
        description: `Dépense créée: ${expenseData.description} (${expenseData.amount}$)`,
        relatedEntityType: 'expense',
        relatedEntityId: data.id,
        metadata: { amount: expenseData.amount, category: expenseData.category }
      });
      
      toast({
        title: "Success",
        description: "Expense created successfully"
      });

      return data;
    } catch (error: any) {
      console.error("Error creating expense:", error);
      
      // Re-throw limit errors so they can be handled by the component
      if (error.code === 'LIMIT_REACHED') {
        throw error;
      }
      
      toast({
        title: "Error",
        description: "Failed to create expense",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateExpense = async (id: string, updates: ExpenseUpdate) => {
    if (!user) return;
    
    // Get current expense for permission check and logging
    const currentExpense = expenses.find(exp => exp.id === id);
    
    // Check permission
    if (currentExpense && !canEditExpense(currentExpense)) {
      toast({
        title: "Error",
        description: "You don't have permission to edit this expense",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchExpenses();
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'expense_updated',
        description: `Dépense modifiée: ${currentExpense?.description || updates.description}`,
        relatedEntityType: 'expense',
        relatedEntityId: id,
        metadata: { changes: Object.keys(updates) }
      });
      
      toast({
        title: "Success",
        description: "Expense updated successfully"
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive"
      });
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    
    // Get expense for permission check and logging before deletion
    const expenseToDelete = expenses.find(exp => exp.id === id);
    
    // Check permission
    if (expenseToDelete && !canDeleteExpense(expenseToDelete)) {
      toast({
        title: "Error",
        description: "You don't have permission to delete this expense",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchExpenses();
      
      // Invalider le cache des limites et du dashboard pour mettre à jour le compteur
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Log audit event
      logAuditEvent({
        userId: user.id,
        userName: username || user.email?.split('@')[0] || 'User',
        category: 'sales',
        eventType: 'expense_deleted',
        description: `Dépense supprimée: ${expenseToDelete?.description} (${expenseToDelete?.amount}$)`,
        relatedEntityType: 'expense',
        relatedEntityId: id,
        metadata: { description: expenseToDelete?.description, amount: expenseToDelete?.amount }
      });
      
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  // Get unique creators from expenses for filtering
  const uniqueCreators = useMemo(() => {
    const creatorsMap = new Map<string, { userId: string; name: string }>();
    
    expenses.forEach(expense => {
      if (!creatorsMap.has(expense.user_id)) {
        const name = expense.profiles?.username || 
                     expense.profiles?.display_name || 
                     (expense.user_id === user?.id ? 'Me' : 'Unknown');
        creatorsMap.set(expense.user_id, { userId: expense.user_id, name });
      }
    });
    
    return Array.from(creatorsMap.values());
  }, [expenses, user?.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
    // Permission helpers
    canViewAll,
    canEditAll,
    canDelete,
    canEditExpense,
    canDeleteExpense,
    uniqueCreators
  };
};
