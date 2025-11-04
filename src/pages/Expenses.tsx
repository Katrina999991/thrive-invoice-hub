import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Calendar, DollarSign, Edit, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

const Expenses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { expenses, loading: expensesLoading, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { categories, loading: categoriesLoading } = useCategories();
  const { clients, loading: clientsLoading } = useClients();
  const { isLimitReached } = useSubscription();

  // Helper to get translated category name
  const getCategoryName = (category: any) => {
    if (!category) return "";
    if (language === "fr") {
      return category.name_fr || category.name;
    }
    return category.name_en || category.name;
  };

  // Helper to get translated category name from string
  const getTranslatedCategoryName = (categoryName: string) => {
    if (!categoryName) return "";
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return categoryName;
    return getCategoryName(category);
  };

  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    expense_date: "",
    client_id: "",
    notes: "",
    vendor: "",
    status: "unpaid"
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const handleAddExpenseClick = () => {
    if (isLimitReached('expenses')) {
      setShowLimitDialog(true);
      return;
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newExpense.category) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une catégorie",
        variant: "destructive",
      });
      return;
    }
    
    if (editingExpense) {
      // Update existing expense
      await updateExpense(editingExpense.id, {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category,
        client_id: newExpense.client_id || null,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes || null,
        vendor: newExpense.vendor || null,
        status: newExpense.status
      });
    } else {
      // Add new expense
      await createExpense({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category,
        client_id: newExpense.client_id || null,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes || null,
        vendor: newExpense.vendor || null,
        status: newExpense.status
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewExpense({
      description: "",
      amount: "",
      category: "",
      expense_date: "",
      client_id: "",
      notes: "",
      vendor: "",
      status: "unpaid"
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      client_id: expense.client_id || "",
      expense_date: expense.expense_date,
      notes: expense.notes || "",
      vendor: expense.vendor || "",
      status: expense.status
    });
    setIsDialogOpen(true);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "unpaid": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidExpenses = expenses.filter(e => e.status === "paid").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const unpaidExpenses = expenses.filter(e => e.status === "unpaid").reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (expensesLoading || clientsLoading) {
    return <div>{t("expenses.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Limite de dépenses atteinte" : "Expense Limit Reached"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Vous avez atteint votre limite mensuelle de dépenses. Améliorez votre plan pour ajouter plus de dépenses."
                : "You've reached your monthly expense limit. Upgrade your plan to add more expenses."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/dashboard/pricing")}>
              {language === "fr" ? "Voir les tarifs" : "View Pricing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("expenses.title")}</h1>
          <p className="text-muted-foreground">
            {t("expenses.subtitle")}
          </p>
        </div>
        <Button onClick={handleAddExpenseClick}>
          <Plus className="h-4 w-4 mr-2" />
          {t("expenses.addButton")}
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? t("expenses.dialog.edit") : t("expenses.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingExpense ? t("expenses.dialog.editDesc") : t("expenses.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">{t("expenses.description")} <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  placeholder={t("expenses.descPlaceholder")}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("expenses.amount")} <span className="text-destructive">*</span></Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder={t("expenses.amountPlaceholder")}
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("expenses.category")} <span className="text-destructive">*</span></Label>
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("expenses.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {language === "fr" ? "Aucune catégorie. " : "No categories. "}
                        <Link to="/categories" className="text-primary hover:underline inline-flex items-center gap-1">
                          {language === "fr" ? "Créer une catégorie" : "Create a category"}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      categories
                        .filter(cat => cat.for_expenses)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || "#3b82f6" }} />
                              {getCategoryName(cat)}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_date">{t("expenses.date")} <span className="text-destructive">*</span></Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">{t("expenses.client")}</Label>
                <Select value={newExpense.client_id} onValueChange={(value) => setNewExpense({...newExpense, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("expenses.clientPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">{t("expenses.vendor")}</Label>
                <Input
                  id="vendor"
                  placeholder={t("expenses.vendorPlaceholder")}
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({...newExpense, vendor: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("expenses.status")}</Label>
                <Select value={newExpense.status || "unpaid"} onValueChange={(value) => setNewExpense({...newExpense, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("expenses.statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">{t("expenses.unpaid")}</SelectItem>
                    <SelectItem value="paid">{t("expenses.paid")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t("expenses.notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("expenses.notesPlaceholder")}
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {t("expenses.cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {editingExpense ? t("expenses.updateButton") : t("expenses.addExpense")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("expenses.total")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("expenses.paid")}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paidExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("expenses.unpaid")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${unpaidExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("expenses.listTitle")}</CardTitle>
          <CardDescription>
            {t("expenses.listDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{expense.description}</h3>
                    <Badge className={getStatusColor(expense.status)}>
                      {expense.status === "paid" ? t("expenses.paid") : t("expenses.unpaid")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {expense.vendor ? `${expense.vendor} • ` : ""}{getTranslatedCategoryName(expense.category)} • {expense.expense_date}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-lg font-semibold">${Number(expense.amount).toFixed(2)}</div>
                  <div className="flex space-x-1">
                    <Select value={expense.status} onValueChange={(value) => updateExpense(expense.id, { status: value })}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">{t("expenses.unpaid")}</SelectItem>
                        <SelectItem value="paid">{t("expenses.paid")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(expense)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("expenses.delete")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("expenses.deleteConfirm")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("expenses.cancel")}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteExpense(expense.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("expenses.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;