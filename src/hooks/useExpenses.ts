import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type ExpenseInsert = TablesInsert<"expenses">;
type ExpenseUpdate = TablesUpdate<"expenses">;

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchExpenses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
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
  };

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
      
      // Invalider le cache des limites pour mettre à jour le compteur
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
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
    try {
      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchExpenses();
      
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
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchExpenses();
      
      // Invalider le cache des limites pour mettre à jour le compteur
      queryClient.invalidateQueries({ queryKey: ["planLimits", user.id] });
      
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

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  return {
    expenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses
  };
};