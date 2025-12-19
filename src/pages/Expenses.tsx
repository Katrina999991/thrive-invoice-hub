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
import { Plus, Receipt, Calendar, DollarSign, Edit, Trash2, ExternalLink, X, Building2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useCompanies } from "@/hooks/useCompanies";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

const Expenses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { expenses, loading: expensesLoading, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { categories, loading: categoriesLoading } = useCategories();
  const { companies, loading: companiesLoading } = useCompanies();
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
    company_id: "",
    notes: "",
    vendor: "",
    status: "paid",
    taxes: [] as Array<{ name: string; percentage: number; amount?: number }>
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  
  // Bulk selection state
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [bulkCompanyDialogOpen, setBulkCompanyDialogOpen] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState<string>("");
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const handleAddExpenseClick = () => {
    if (isLimitReached('expenses')) {
      setShowLimitDialog(true);
      return;
    }
    setIsDialogOpen(true);
  };

  // Handle extracted data from receipt scanner
  const handleReceiptDataExtracted = (data: {
    amount: number | null;
    vendor: string | null;
    date: string | null;
    description: string | null;
    category: string | null;
  }) => {
    // Map AI category to existing category
    const categoryMapping: Record<string, string> = {
      "Fournitures": "Fournitures",
      "Supplies": "Fournitures",
      "Transport": "Transport",
      "Transportation": "Transport",
      "Repas": "Repas",
      "Meals": "Repas",
      "Services": "Services",
      "Équipement": "Équipement",
      "Equipment": "Équipement",
      "Marketing": "Marketing",
      "Autres": "Autres",
      "Other": "Autres"
    };

    const mappedCategory = data.category ? categoryMapping[data.category] || "" : "";
    const matchingCategory = categories.find(cat => 
      cat.name === mappedCategory || 
      cat.name_fr === mappedCategory || 
      cat.name_en === data.category
    );

    setNewExpense(prev => ({
      ...prev,
      amount: data.amount?.toString() || prev.amount,
      vendor: data.vendor || prev.vendor,
      expense_date: data.date || prev.expense_date,
      description: data.description || prev.description,
      category: matchingCategory?.name || prev.category
    }));
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
        company_id: newExpense.company_id || null,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes || null,
        vendor: newExpense.vendor || null,
        status: newExpense.status,
        taxes: newExpense.taxes
      } as any);
    } else {
      // Add new expense
      await createExpense({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category,
        company_id: newExpense.company_id || null,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes || null,
        vendor: newExpense.vendor || null,
        status: newExpense.status,
        taxes: newExpense.taxes
      } as any);
    }

    resetForm();
  };

  const resetForm = () => {
    setNewExpense({
      description: "",
      amount: "",
      category: "",
      expense_date: "",
      company_id: "",
      notes: "",
      vendor: "",
      status: "paid",
      taxes: []
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
      company_id: (expense as any).company_id || "",
      expense_date: expense.expense_date,
      notes: expense.notes || "",
      vendor: expense.vendor || "",
      status: expense.status,
      taxes: (expense as any).taxes || []
    });
    setIsDialogOpen(true);
  };

  // Bulk selection handlers
  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.size === expenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(expenses.map(e => e.id)));
    }
  };

  const handleBulkCompanyChange = async () => {
    if (selectedExpenses.size === 0) return;
    
    const companyIdToSet = bulkCompanyId === "none" ? null : bulkCompanyId || null;
    
    // Update all selected expenses
    for (const expenseId of selectedExpenses) {
      await updateExpense(expenseId, { company_id: companyIdToSet });
    }
    
    toast({
      title: language === "fr" ? "Succès" : "Success",
      description: language === "fr" 
        ? `${selectedExpenses.size} dépense(s) mise(s) à jour` 
        : `${selectedExpenses.size} expense(s) updated`
    });
    
    setSelectedExpenses(new Set());
    setBulkCompanyDialogOpen(false);
    setBulkCompanyId("");
  };

  const handleBulkStatusChange = async () => {
    if (selectedExpenses.size === 0 || !bulkStatus) return;
    
    for (const expenseId of selectedExpenses) {
      await updateExpense(expenseId, { status: bulkStatus });
    }
    
    toast({
      title: language === "fr" ? "Succès" : "Success",
      description: language === "fr" 
        ? `${selectedExpenses.size} dépense(s) mise(s) à jour` 
        : `${selectedExpenses.size} expense(s) updated`
    });
    
    setSelectedExpenses(new Set());
    setBulkStatusDialogOpen(false);
    setBulkStatus("");
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

  if (expensesLoading || companiesLoading) {
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("expenses.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("expenses.subtitle")}
          </p>
        </div>
        <Button onClick={handleAddExpenseClick} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t("expenses.addButton")}
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? t("expenses.dialog.edit") : t("expenses.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingExpense ? t("expenses.dialog.editDesc") : t("expenses.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
              {/* Receipt Scanner - only show when adding new expense */}
              {!editingExpense && (
                <>
                  <ReceiptScanner onDataExtracted={handleReceiptDataExtracted} />
                  <Separator />
                </>
              )}
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
                <Label htmlFor="company_id">{t("expenses.company")}</Label>
                <Select 
                  value={newExpense.company_id} 
                  onValueChange={(value) => {
                    const selectedCompany = companies.find(c => c.id === value);
                    const companyTaxes = selectedCompany?.taxes as any[] || [];
                    const initialTaxes = companyTaxes.map((tax: any) => ({
                      name: tax.name,
                      percentage: tax.percentage,
                      amount: 0
                    }));
                    setNewExpense({...newExpense, company_id: value, taxes: initialTaxes});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("expenses.companyPlaceholder")} />
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
              
              {/* Taxes Section */}
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{language === "fr" ? "Taxes payées" : "Taxes Paid"}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewExpense({
                        ...newExpense,
                        taxes: [...newExpense.taxes, { name: "", percentage: 0, amount: 0 }]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {language === "fr" ? "Ajouter taxe" : "Add Tax"}
                  </Button>
                </div>
                
                {newExpense.taxes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Aucune taxe ajoutée. Cliquez sur 'Ajouter taxe' pour inclure TPS, TVQ, etc."
                      : "No taxes added. Click 'Add Tax' to include GST, PST, etc."}
                  </p>
                )}
                
                {newExpense.taxes.map((tax, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`tax-name-${index}`} className="text-xs">
                        {language === "fr" ? "Nom" : "Name"}
                      </Label>
                      <Select 
                        value={tax.name} 
                        onValueChange={(value) => {
                          const updatedTaxes = [...newExpense.taxes];
                          // Find the tax percentage from company taxes if available
                          const selectedCompany = companies.find(c => c.id === newExpense.company_id);
                          const companyTaxes = (selectedCompany?.taxes as any[]) || [];
                          const matchingTax = companyTaxes.find(t => t.name === value);
                          updatedTaxes[index] = {
                            ...updatedTaxes[index],
                            name: value,
                            percentage: matchingTax?.percentage || updatedTaxes[index].percentage
                          };
                          setNewExpense({...newExpense, taxes: updatedTaxes});
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === "fr" ? "Sélectionner" : "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TPS">TPS (GST)</SelectItem>
                          <SelectItem value="TVQ">TVQ (QST)</SelectItem>
                          <SelectItem value="TVH">TVH (HST)</SelectItem>
                          <SelectItem value="TVP">TVP (PST)</SelectItem>
                          <SelectItem value="other">{language === "fr" ? "Autre" : "Other"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label htmlFor={`tax-rate-${index}`} className="text-xs">%</Label>
                      <Input
                        id={`tax-rate-${index}`}
                        type="number"
                        step="0.01"
                        placeholder="5"
                        value={tax.percentage || ""}
                        onChange={(e) => {
                          const updatedTaxes = [...newExpense.taxes];
                          updatedTaxes[index] = {
                            ...updatedTaxes[index],
                            percentage: parseFloat(e.target.value) || 0
                          };
                          setNewExpense({...newExpense, taxes: updatedTaxes});
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label htmlFor={`tax-amount-${index}`} className="text-xs">
                        {language === "fr" ? "Montant" : "Amount"}
                      </Label>
                      <Input
                        id={`tax-amount-${index}`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={tax.amount || ""}
                        onChange={(e) => {
                          const updatedTaxes = [...newExpense.taxes];
                          updatedTaxes[index] = {
                            ...updatedTaxes[index],
                            amount: parseFloat(e.target.value) || 0
                          };
                          setNewExpense({...newExpense, taxes: updatedTaxes});
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        const updatedTaxes = newExpense.taxes.filter((_, i) => i !== index);
                        setNewExpense({...newExpense, taxes: updatedTaxes});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {newExpense.taxes.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{language === "fr" ? "Total taxes" : "Total Taxes"}</span>
                      <span>${newExpense.taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
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
                <Select value={newExpense.status || "paid"} onValueChange={(value) => setNewExpense({...newExpense, status: value})}>
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
            </ScrollArea>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t("expenses.listTitle")}</CardTitle>
              <CardDescription>
                {t("expenses.listDesc")}
              </CardDescription>
            </div>
            {selectedExpenses.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedExpenses.size} {language === "fr" ? "sélectionné(s)" : "selected"}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBulkCompanyDialogOpen(true)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {language === "fr" ? "Compagnie" : "Company"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBulkStatusDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {language === "fr" ? "Statut" : "Status"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedExpenses(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <Checkbox
                checked={selectedExpenses.size === expenses.length && expenses.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {language === "fr" ? "Tout sélectionner" : "Select all"}
              </span>
            </div>
          )}
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedExpenses.has(expense.id)}
                    onCheckedChange={() => toggleExpenseSelection(expense.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-medium">{expense.description}</h3>
                      <Badge className={getStatusColor(expense.status)}>
                        {expense.status === "paid" ? t("expenses.paid") : t("expenses.unpaid")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {expense.vendor ? `${expense.vendor} • ` : ""}{getTranslatedCategoryName(expense.category)} • {expense.expense_date}
                      {(expense as any).companies?.name && ` • ${(expense as any).companies.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold">${Number(expense.amount).toFixed(2)}</div>
                    {((expense as any).taxes as any[] || []).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {language === "fr" ? "Taxes: " : "Taxes: "}
                        ${((expense as any).taxes as any[] || []).reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
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

      {/* Bulk Company Change Dialog */}
      <Dialog open={bulkCompanyDialogOpen} onOpenChange={setBulkCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Modifier la compagnie" : "Change Company"}
            </DialogTitle>
            <DialogDescription>
              {language === "fr" 
                ? `Modifier la compagnie pour ${selectedExpenses.size} dépense(s) sélectionnée(s)`
                : `Change company for ${selectedExpenses.size} selected expense(s)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "fr" ? "Compagnie" : "Company"}</Label>
              <Select value={bulkCompanyId} onValueChange={setBulkCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Sélectionner une compagnie" : "Select a company"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {language === "fr" ? "Aucune compagnie" : "No company"}
                  </SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkCompanyDialogOpen(false)}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handleBulkCompanyChange}>
              {language === "fr" ? "Appliquer" : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Modifier le statut" : "Change Status"}
            </DialogTitle>
            <DialogDescription>
              {language === "fr" 
                ? `Modifier le statut pour ${selectedExpenses.size} dépense(s) sélectionnée(s)`
                : `Change status for ${selectedExpenses.size} selected expense(s)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "fr" ? "Statut" : "Status"}</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Sélectionner un statut" : "Select a status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">{t("expenses.paid")}</SelectItem>
                  <SelectItem value="unpaid">{t("expenses.unpaid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!bulkStatus}>
              {language === "fr" ? "Appliquer" : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;