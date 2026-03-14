import { useState, useEffect } from "react";
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
import { Plus, Receipt, Calendar, DollarSign, Edit, Trash2, ExternalLink, X, Building2, CheckCircle, Archive, ArchiveRestore, Search, Sparkles, AlertCircle, Check, User, Filter, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useCompanies } from "@/hooks/useCompanies";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useCategoryMappings } from "@/hooks/useCategoryMappings";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReceiptScanner, ExtractedReceiptData } from "@/components/ReceiptScanner";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { processTaxSplit } from "@/lib/taxSplitUtils";
import { getDeductionSuggestion } from "@/lib/deductionRules";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

const Expenses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories();
  const { companies, loading: companiesLoading } = useCompanies();
  const { isLimitReached } = useSubscription();
  const { selectedCompanyId, hasPermission, permissions, loading: permissionsLoading } = useSelectedCompany();
  
  // Fetch expenses with permissions
  const { 
    expenses, 
    loading: expensesLoading, 
    createExpense, 
    updateExpense, 
    deleteExpense,
    approveExpense,
    unapproveExpense,
    canViewAll,
    canEditExpense,
    canDeleteExpense,
    uniqueCreators
  } = useExpenses({
    showArchived,
    companyId: selectedCompanyId,
    permissions
  });

  // Permission checks
  const canApproveExpenses = hasPermission("expenses:approve");

  // Permission checks
  const canCreateExpenses = hasPermission("expenses:create");
  const canEditExpenses = hasPermission("expenses:edit") || hasPermission("expenses:edit_own") || hasPermission("expenses:edit_all");
  const canDeleteExpenses = hasPermission("expenses:delete");

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
    taxes: [] as Array<{ name: string; percentage: number; amount?: number }>,
    deductible_percent: null as number | null,
    tax_recoverable_percent: 100 as number | null
  });
  
  // Deduction suggestion state
  const [deductionSuggestion, setDeductionSuggestion] = useState<{
    percent: number;
    note: string;
  } | null>(null);
  const [deductionManuallySet, setDeductionManuallySet] = useState(false);
  
  // Smart category tracking
  const [suggestedCategoryInfo, setSuggestedCategoryInfo] = useState<{
    category: string | null;
    categoryId: string | null;
    confidence: number;
    source: "learned_vendor" | "learned_keyword" | "ai_suggestion" | "default";
    vendorNormalized: string | null;
    extractedKeywords: string[];
  } | null>(null);
  const [originalSuggestedCategory, setOriginalSuggestedCategory] = useState<string | null>(null);
  
  // Receipt data for tax splitting
  const [receiptData, setReceiptData] = useState<ExtractedReceiptData | null>(null);
  
  // Tax helper text
  const [taxHelperText, setTaxHelperText] = useState<{
    text: string;
    type: 'success' | 'warning';
  } | null>(null);
  
  // Track if taxes were auto-added and modified by user
  const [taxesAutoAdded, setTaxesAutoAdded] = useState(false);
  const [taxesUserModified, setTaxesUserModified] = useState(false);
  
  // Store original receipt total for auto-adjusting amount when taxes change
  const [originalReceiptTotal, setOriginalReceiptTotal] = useState<number | null>(null);
  
  // Temporary string state for total amount input to allow proper decimal input
  const [totalAmountInput, setTotalAmountInput] = useState<string>("");
  
  // Category mappings hook - now user-level, not company-level
  const { saveMappingsFromScan, findSuggestedCategory, mappings: categoryMappings } = useCategoryMappings();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  
  // Bulk selection state
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [bulkCompanyDialogOpen, setBulkCompanyDialogOpen] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState<string>("");
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterCreators, setFilterCreators] = useState<string[]>([]);
  const [filterApproval, setFilterApproval] = useState<string>("all"); // "all" | "pending" | "approved"

  const handleAddExpenseClick = () => {
    if (isLimitReached('expenses')) {
      setShowLimitDialog(true);
      return;
    }
    // Auto-select the company if one is selected
    if (selectedCompanyId) {
      const selectedCompany = companies.find(c => c.id === selectedCompanyId);
      const companyTaxes = selectedCompany?.taxes as any[] || [];
      const initialTaxes = companyTaxes.map((tax: any) => ({
        name: tax.name,
        percentage: tax.percentage,
        amount: 0
      }));
      setNewExpense(prev => ({ 
        ...prev, 
        company_id: selectedCompanyId,
        taxes: initialTaxes
      }));
    }
    setIsDialogOpen(true);
  };

  // Handle extracted data from receipt scanner
  const handleReceiptDataExtracted = (data: ExtractedReceiptData) => {
    console.log("=== RECEIPT DATA EXTRACTED ===");
    console.log("Suggested category from API:", data.suggested_category);
    console.log("Suggested category ID from API:", data.suggested_category_id);
    console.log("Category source:", data.category_source);
    console.log("Available categories:", categories.map(c => ({ 
      id: c.id, 
      name: c.name, 
      name_en: c.name_en, 
      name_fr: c.name_fr 
    })));
    
    // Helper function to find matching category with multiple fallback strategies
    const findMatchingCategory = () => {
      // 1. First try by ID if provided
      if (data.suggested_category_id) {
        const match = categories.find(cat => cat.id === data.suggested_category_id);
        console.log("Match by ID:", match?.name);
        if (match) return match;
      }
      
      // 2. Try exact name match
      if (data.suggested_category) {
        const exactMatch = categories.find(cat => 
          cat.name === data.suggested_category ||
          cat.name_en === data.suggested_category ||
          cat.name_fr === data.suggested_category
        );
        console.log("Exact name match:", exactMatch?.name);
        if (exactMatch) return exactMatch;
      }
      
      // 3. Try case-insensitive match
      if (data.suggested_category) {
        const lowerSuggested = data.suggested_category.toLowerCase();
        const caseMatch = categories.find(cat => 
          cat.name?.toLowerCase() === lowerSuggested ||
          cat.name_en?.toLowerCase() === lowerSuggested ||
          cat.name_fr?.toLowerCase() === lowerSuggested
        );
        console.log("Case-insensitive match:", caseMatch?.name);
        if (caseMatch) return caseMatch;
      }
      
      // 4. Try partial/contains match
      if (data.suggested_category) {
        const lowerSuggested = data.suggested_category.toLowerCase();
        const partialMatch = categories.find(cat => 
          cat.name?.toLowerCase().includes(lowerSuggested) ||
          cat.name_en?.toLowerCase().includes(lowerSuggested) ||
          cat.name_fr?.toLowerCase().includes(lowerSuggested) ||
          lowerSuggested.includes(cat.name?.toLowerCase() || "") ||
          lowerSuggested.includes(cat.name_en?.toLowerCase() || "") ||
          lowerSuggested.includes(cat.name_fr?.toLowerCase() || "")
        );
        console.log("Partial match:", partialMatch?.name);
        if (partialMatch) return partialMatch;
      }
      
      // 5. Try mapping common category names to existing categories
      const categoryNameMappings: Record<string, string[]> = {
        // Equipment -> Office (since no Equipment category exists)
        "equipment": ["office", "bureau", "fournitures", "supplies"],
        "équipement": ["office", "bureau", "fournitures", "supplies"],
        "equipement": ["office", "bureau", "fournitures", "supplies"],
        "hardware": ["office", "bureau"],
        "electronics": ["office", "bureau"],
        "matériel": ["office", "bureau"],
        // Meals
        "meals": ["repas", "food", "restaurant", "nourriture"],
        "repas": ["meals", "food", "restaurant", "nourriture"],
        "food": ["meals", "repas"],
        "restaurant": ["meals", "repas"],
        // Transport/Travel
        "transport": ["travel", "voyage", "transportation"],
        "travel": ["transport", "voyage", "transportation"],
        "voyage": ["transport", "travel", "transportation"],
        // Other
        "other": ["autres", "autre", "miscellaneous", "divers"],
        "autres": ["other", "autre", "miscellaneous", "divers"],
        "autre": ["other", "autres", "miscellaneous", "divers"],
        // Software
        "software": ["logiciels", "logiciel"],
        "logiciels": ["software", "logiciel"],
        // Office
        "office": ["bureau", "fournitures", "supplies"],
        "bureau": ["office", "fournitures", "supplies"],
        "supplies": ["fournitures", "office", "bureau"],
        "fournitures": ["supplies", "office", "bureau"],
        // Services
        "services": ["consulting", "consultation"],
        "consulting": ["services", "consultation"],
        // Utilities
        "utilities": ["services publics", "télécommunications"],
        "services publics": ["utilities"],
      };
      
      if (data.suggested_category) {
        const lowerSuggested = data.suggested_category.toLowerCase();
        const alternativeNames = categoryNameMappings[lowerSuggested] || [];
        console.log("Looking for alternatives for:", lowerSuggested, "->", alternativeNames);
        
        for (const altName of alternativeNames) {
          const altMatch = categories.find(cat => 
            cat.name?.toLowerCase() === altName ||
            cat.name_en?.toLowerCase() === altName ||
            cat.name_fr?.toLowerCase() === altName
          );
          if (altMatch) {
            console.log("Alternative name match:", altMatch?.name);
            return altMatch;
          }
        }
      }
      
      // 6. Last resort: fallback to "Other" category
      const otherCategory = categories.find(cat => 
        cat.name?.toLowerCase() === "other" ||
        cat.name_en?.toLowerCase() === "other" ||
        cat.name_fr?.toLowerCase() === "autre"
      );
      if (otherCategory) {
        console.log("Fallback to Other category:", otherCategory.name);
        return otherCategory;
      }
      
      console.log("No category match found!");
      return null;
    };
    
    const matchingCategory = findMatchingCategory();
    console.log("Final matching category:", matchingCategory?.name);
    
    // Use language-appropriate description
    const description = language === "fr" 
      ? (data.description_fr || data.description_en || data.description)
      : (data.description_en || data.description_fr || data.description);
    
    const categoryName = matchingCategory?.name || "";
    console.log("Setting category to:", categoryName);
    
    // Store receipt data for tax splitting
    setReceiptData(data);
    
    // If company is already selected, apply tax split immediately
    const selectedCompany = companies.find(c => c.id === newExpense.company_id);
    if (selectedCompany) {
      const companySettings = {
        expense_tax_handling: ((selectedCompany as any).expense_tax_handling || 'auto') as 'auto' | 'always' | 'never',
        taxes: ((selectedCompany as any).taxes || []) as Array<{ name: string; percentage: number }>
      };
      
      const taxResult = processTaxSplit({
        total_amount: data.total_amount || data.amount,
        subtotal_amount: data.subtotal_amount,
        tax_lines: data.tax_lines,
        tax_included_hint: data.tax_included_hint
      }, companySettings, language as 'fr' | 'en');
      
      setNewExpense(prev => ({
        ...prev,
        amount: taxResult.amountBeforeTax.toString(),
        vendor: data.vendor || prev.vendor,
        expense_date: data.date || prev.expense_date,
        description: description || prev.description,
        category: categoryName || prev.category,
        taxes: taxResult.taxes
      }));
      
      if (taxResult.helperText && taxResult.helperTextType) {
        setTaxHelperText({ text: taxResult.helperText, type: taxResult.helperTextType });
        setTaxesAutoAdded(taxResult.taxes.length > 0);
      } else {
        setTaxHelperText(null);
        setTaxesAutoAdded(false);
      }
      // Store original total for later tax adjustments
      const total = data.total_amount || data.amount || null;
      setOriginalReceiptTotal(total);
      setTotalAmountInput(total !== null ? total.toFixed(2) : "");
    } else {
      // No company selected - calculate amount before taxes but don't display taxes
      const total = data.total_amount || data.amount || 0;
      const taxLines = data.tax_lines || [];
      const hasExplicitTaxes = taxLines.length > 0 && taxLines.some((t: any) => t.amount > 0);
      
      let amountBeforeTax = total;
      let showWarning = false;
      
      // When explicit tax lines exist, compute before-tax = total - sum(taxes)
      if (hasExplicitTaxes) {
        const taxSum = taxLines.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        amountBeforeTax = Math.round((total - taxSum) * 100) / 100;
      } else if (data.subtotal_amount != null && data.subtotal_amount > 0 && data.subtotal_amount < total) {
        // Use OCR subtotal when available and it's less than total (indicating taxes exist)
        amountBeforeTax = data.subtotal_amount;
        showWarning = true;
      }
      // If no tax_lines and no subtotal, use total as amount (no taxes detected)
      
      // Don't set taxes when no company is selected - taxes only shown with company + option enabled
      setNewExpense(prev => ({
        ...prev,
        amount: amountBeforeTax.toFixed(2),
        vendor: data.vendor || prev.vendor,
        expense_date: data.date || prev.expense_date,
        description: description || prev.description,
        category: categoryName || prev.category,
        taxes: [] // No taxes without company
      }));
      // Store original total for later tax adjustments
      setOriginalReceiptTotal(total);
      setTotalAmountInput(total.toFixed(2));
      if (showWarning) {
        setTaxHelperText({ 
          text: language === "fr" 
            ? "Sous-total détecté mais les taxes n'ont pas pu être séparées. Veuillez vérifier." 
            : "Subtotal detected but taxes could not be separated. Please verify.",
          type: 'warning' 
        });
      } else {
        setTaxHelperText(null);
      }
      setTaxesAutoAdded(false);
    }
    
    setTaxesUserModified(false);
    
    // Store suggestion info for learning
    setSuggestedCategoryInfo({
      category: categoryName,
      categoryId: matchingCategory?.id || null,
      confidence: data.category_confidence || 0,
      source: data.category_source || "default",
      vendorNormalized: data.vendor_normalized || null,
      extractedKeywords: data.extracted_keywords || []
    });
    setOriginalSuggestedCategory(categoryName);
  };
  
  // Function to apply tax split when company changes
  const applyTaxSplitForCompany = (companyId: string) => {
    if (!receiptData) return;
    
    const selectedCompany = companies.find(c => c.id === companyId);
    if (!selectedCompany) return;
    
    const companySettings = {
      expense_tax_handling: ((selectedCompany as any).expense_tax_handling || 'auto') as 'auto' | 'always' | 'never',
      taxes: ((selectedCompany as any).taxes || []) as Array<{ name: string; percentage: number }>
    };
    
    const taxResult = processTaxSplit({
      total_amount: receiptData.total_amount || receiptData.amount,
      subtotal_amount: receiptData.subtotal_amount,
      tax_lines: receiptData.tax_lines,
      tax_included_hint: receiptData.tax_included_hint
    }, companySettings, language as 'fr' | 'en');
    
    setNewExpense(prev => ({
      ...prev,
      amount: taxResult.amountBeforeTax.toString(),
      taxes: taxResult.taxes
    }));
    
    if (taxResult.helperText && taxResult.helperTextType) {
      setTaxHelperText({ text: taxResult.helperText, type: taxResult.helperTextType });
      setTaxesAutoAdded(taxResult.taxes.length > 0);
    } else {
      setTaxHelperText(null);
      setTaxesAutoAdded(false);
    }
    setTaxesUserModified(false);
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
    
    // Check if category was changed from suggestion (for learning)
    const wasCategoryChanged = suggestedCategoryInfo && 
      originalSuggestedCategory !== newExpense.category;
    
    // Find the selected category ID for learning
    const selectedCategory = categories.find(cat => cat.name === newExpense.category);
    
    // Debug logging for category learning
    console.log("=== CATEGORY LEARNING DEBUG ===");
    console.log("suggestedCategoryInfo:", suggestedCategoryInfo);
    console.log("originalSuggestedCategory:", originalSuggestedCategory);
    console.log("newExpense.category:", newExpense.category);
    console.log("wasCategoryChanged:", wasCategoryChanged);
    console.log("selectedCategory:", selectedCategory);
    
    // Save learned mapping if category was changed from a scan
    if (wasCategoryChanged && suggestedCategoryInfo && selectedCategory) {
      console.log("Saving learned mapping for vendor:", suggestedCategoryInfo.vendorNormalized);
      console.log("Keywords:", suggestedCategoryInfo.extractedKeywords);
      console.log("Category ID:", selectedCategory.id);
      await saveMappingsFromScan(
        suggestedCategoryInfo.vendorNormalized || "",
        suggestedCategoryInfo.extractedKeywords,
        selectedCategory.id,
        true,
        newExpense.company_id || undefined
      );
      console.log("Mapping saved successfully!");
    } else {
      console.log("NOT saving mapping - conditions not met");
    }
    
    // For scanned receipts where user changed the category: the learning is already done above
    // For manual entries (no scan): learn from the description/vendor
    // IMPORTANT: Only learn if this is NOT a scanned receipt where category was NOT changed
    // (to avoid overwriting learned mappings with wrong categories)
    const isScannedReceipt = suggestedCategoryInfo !== null;
    const shouldLearnFromManualEntry = !isScannedReceipt && selectedCategory && newExpense.description;
    
    if (shouldLearnFromManualEntry) {
      // Extract keywords from description (words with 3+ chars)
      const descriptionKeywords = newExpense.description
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 3)
        .slice(0, 3);
      
      // If we have a vendor, save it as a mapping
      if (newExpense.vendor) {
        const normalizedVendor = newExpense.vendor.toLowerCase().trim();
        await saveMappingsFromScan(
          normalizedVendor,
          descriptionKeywords,
          selectedCategory.id,
          true,
          newExpense.company_id || undefined
        );
      } else if (descriptionKeywords.length > 0) {
        // If no vendor, just save keywords
        await saveMappingsFromScan(
          "",
          descriptionKeywords,
          selectedCategory.id,
          true,
          newExpense.company_id || undefined
        );
      }
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
        taxes: newExpense.taxes,
        deductible_percent: newExpense.deductible_percent,
        tax_recoverable_percent: newExpense.tax_recoverable_percent
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
        taxes: newExpense.taxes,
        deductible_percent: newExpense.deductible_percent,
        tax_recoverable_percent: newExpense.tax_recoverable_percent
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
      taxes: [],
      deductible_percent: null,
      tax_recoverable_percent: 100
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
    setSuggestedCategoryInfo(null);
    setOriginalSuggestedCategory(null);
    setReceiptData(null);
    setTaxHelperText(null);
    setTaxesAutoAdded(false);
    setTaxesUserModified(false);
    setDeductionSuggestion(null);
    setDeductionManuallySet(false);
    setOriginalReceiptTotal(null);
    setTotalAmountInput("");
  };

  // Helper function to recalculate amount from taxes
  const recalculateAmountFromTaxes = (updatedTaxes: Array<{ name: string; percentage: number; amount?: number }>) => {
    if (originalReceiptTotal !== null) {
      const totalTaxes = updatedTaxes.reduce((sum, tax) => sum + (tax.amount || 0), 0);
      const calculatedAmount = originalReceiptTotal - totalTaxes;
      return calculatedAmount > 0 ? calculatedAmount.toFixed(2) : "0";
    }
    return null; // Don't change amount if no original total
  };

  // Auto-suggest deduction percentage when category or company changes
  useEffect(() => {
    if (deductionManuallySet) return;
    if (!newExpense.category) {
      setDeductionSuggestion(null);
      return;
    }
    
    // Find company jurisdiction
    const selectedCompany = companies.find(c => c.id === newExpense.company_id);
    const country = selectedCompany?.country || null;
    const provinceState = selectedCompany?.province_state || null;
    
    const suggestion = getDeductionSuggestion(newExpense.category, country, provinceState);
    if (suggestion) {
      setDeductionSuggestion({
        percent: suggestion.percent,
        note: language === "fr" ? suggestion.note_fr : suggestion.note_en
      });
      setNewExpense(prev => ({ ...prev, deductible_percent: suggestion.percent }));
    } else {
      setDeductionSuggestion(null);
    }
  }, [newExpense.category, newExpense.company_id, companies, language, deductionManuallySet]);

  // Auto-suggest category based on learned mappings when description changes
  useEffect(() => {
    // Only suggest if:
    // 1. Not editing an existing expense
    // 2. No receipt was scanned (suggestedCategoryInfo is null)
    // 3. Category hasn't been manually selected yet
    // 4. Company is selected
    // 5. There are mappings available
    if (editingExpense || suggestedCategoryInfo || newExpense.category || !newExpense.company_id || categoryMappings.length === 0) {
      return;
    }

    // Debounce the suggestion
    const timeoutId = setTimeout(() => {
      const suggestedCategoryId = findSuggestedCategory(newExpense.vendor, newExpense.description);
      
      if (suggestedCategoryId) {
        const matchingCategory = categories.find(cat => cat.id === suggestedCategoryId);
        if (matchingCategory) {
          console.log("Auto-suggesting category from learned mappings:", matchingCategory.name);
          setNewExpense(prev => ({ ...prev, category: matchingCategory.name }));
          setSuggestedCategoryInfo({
            category: matchingCategory.name,
            categoryId: matchingCategory.id,
            confidence: 0.8,
            source: "learned_keyword",
            vendorNormalized: newExpense.vendor || null,
            extractedKeywords: newExpense.description?.split(/\s+/).filter(w => w.length >= 3) || []
          });
          setOriginalSuggestedCategory(matchingCategory.name);
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [newExpense.description, newExpense.vendor, newExpense.company_id, editingExpense, suggestedCategoryInfo, newExpense.category, categoryMappings, findSuggestedCategory, categories]);

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
      taxes: (expense as any).taxes || [],
      deductible_percent: (expense as any).deductible_percent ?? null,
      tax_recoverable_percent: (expense as any).tax_recoverable_percent ?? 100
    });
    setDeductionManuallySet((expense as any).deductible_percent != null);
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

  const getFilteredExpenses = () => expenses.filter(expense => {
    const matchesSearch = searchTerm === "" || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.vendor && expense.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (expense.notes && expense.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
    const matchesStatus = filterStatus === "all" || expense.status === filterStatus;
    const matchesCompany = filterCompany === "all" || expense.company_id === filterCompany;
    const matchesCreator = filterCreators.length === 0 || filterCreators.includes(expense.user_id);
    
    // Approval filter
    const isApproved = !!(expense as any).approved_at;
    // Pending = not approved AND not own entries (own entries don't need approval)
    const matchesApproval = filterApproval === "all" || 
      (filterApproval === "approved" && isApproved) ||
      (filterApproval === "pending" && !isApproved && expense.user_id !== user?.id);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesCompany && matchesCreator && matchesApproval;
  });

  const toggleSelectAll = () => {
    const filtered = getFilteredExpenses();
    if (selectedExpenses.size === filtered.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filtered.map(e => e.id)));
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

  const handleBulkArchive = async () => {
    if (selectedExpenses.size === 0) return;
    
    for (const expenseId of selectedExpenses) {
      await updateExpense(expenseId, { is_archived: !showArchived });
    }
    
    toast({
      title: language === "fr" ? "Succès" : "Success",
      description: language === "fr" 
        ? `${selectedExpenses.size} dépense(s) ${showArchived ? "désarchivée(s)" : "archivée(s)"}` 
        : `${selectedExpenses.size} expense(s) ${showArchived ? "unarchived" : "archived"}`
    });
    
    setSelectedExpenses(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "unpaid": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredExpenses = getFilteredExpenses();

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidExpenses = filteredExpenses.filter(e => e.status === "paid").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const unpaidExpenses = filteredExpenses.filter(e => e.status === "unpaid").reduce((sum, expense) => sum + Number(expense.amount), 0);

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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{showArchived ? (language === "fr" ? "Actives" : "Active") : (language === "fr" ? "Archivées" : "Archived")}</span>
          </Button>
          {canCreateExpenses && (
            <Button onClick={handleAddExpenseClick} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              {t("expenses.addButton")}
            </Button>
          )}
        </div>
        
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
                  <ReceiptScanner 
                    onDataExtracted={handleReceiptDataExtracted} 
                    companyId={newExpense.company_id || undefined}
                    userId={user?.id}
                  />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">{language === "fr" ? "Montant avant taxes" : "Amount before taxes"} <span className="text-destructive">*</span></Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder={t("expenses.amountPlaceholder")}
                    value={newExpense.amount}
                    onChange={(e) => {
                      const newAmount = parseFloat(e.target.value) || 0;
                      // Auto-calculate tax amounts from percentages
                      const updatedTaxes = newExpense.taxes.map(tax => ({
                        ...tax,
                        amount: tax.percentage ? Math.round(newAmount * tax.percentage) / 100 : (tax.amount || 0)
                      }));
                      const taxTotal = updatedTaxes.reduce((sum, tax) => sum + (tax.amount || 0), 0);
                      const newTotal = newAmount + taxTotal;
                      setNewExpense(prev => ({ ...prev, amount: e.target.value, taxes: updatedTaxes }));
                      setOriginalReceiptTotal(newTotal);
                      setTotalAmountInput(newTotal.toFixed(2));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">{language === "fr" ? "Montant total (après taxes)" : "Total amount (with taxes)"}</Label>
                  <Input
                    id="totalAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={totalAmountInput}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      // Allow typing with comma or period as decimal separator
                      if (rawValue === "" || /^[0-9]*[.,]?[0-9]*$/.test(rawValue)) {
                        setTotalAmountInput(rawValue);
                        // Normalize to dot for calculations
                        const normalizedValue = rawValue.replace(",", ".");
                        const newTotal = parseFloat(normalizedValue) || 0;
                        setOriginalReceiptTotal(newTotal);
                        // Recalculate amount before taxes (allows for discounts which reduce the amount)
                        const taxTotal = newExpense.taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0);
                        const amountBeforeTax = newTotal - taxTotal;
                        setNewExpense(prev => ({
                          ...prev,
                          amount: amountBeforeTax.toFixed(2)
                        }));
                      }
                    }}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">{t("expenses.category")} <span className="text-destructive">*</span></Label>
                  {suggestedCategoryInfo && suggestedCategoryInfo.confidence > 0.3 && newExpense.category === originalSuggestedCategory && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      {suggestedCategoryInfo.source === "learned_vendor" 
                        ? (language === "fr" ? "Appris" : "Learned")
                        : (language === "fr" ? "Suggéré" : "Suggested")}
                    </Badge>
                  )}
                </div>
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

              {/* Deductible Percentage Section */}
              <div className="space-y-2 p-4 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="deductible_percent" className="text-sm font-semibold">
                    {language === "fr" ? "Déductible (%)" : "Deductible (%)"}
                  </Label>
                  {deductionSuggestion && !deductionManuallySet && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      {language === "fr" ? "Suggéré" : "Suggested"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="deductible_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder={language === "fr" ? "Ex: 50, 100" : "e.g. 50, 100"}
                    value={newExpense.deductible_percent ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Math.min(100, Math.max(0, parseFloat(e.target.value)));
                      setNewExpense({ ...newExpense, deductible_percent: val });
                      setDeductionManuallySet(true);
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {newExpense.deductible_percent != null && parseFloat(newExpense.amount) > 0 && (
                    <span className="text-sm text-muted-foreground ml-auto">
                      = ${(parseFloat(newExpense.amount) * (newExpense.deductible_percent / 100)).toFixed(2)} {language === "fr" ? "déductible" : "deductible"}
                    </span>
                  )}
                </div>
                {deductionSuggestion && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    {deductionSuggestion.note}
                  </p>
                )}
                {!deductionSuggestion && !deductionManuallySet && (
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Sélectionnez une catégorie pour obtenir une suggestion automatique" 
                      : "Select a category to get an automatic suggestion"}
                  </p>
                )}
                {deductionManuallySet && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => {
                      setDeductionManuallySet(false);
                      const selectedCompany = companies.find(c => c.id === newExpense.company_id);
                      const suggestion = getDeductionSuggestion(
                        newExpense.category,
                        selectedCompany?.country,
                        selectedCompany?.province_state
                      );
                      if (suggestion) {
                        setDeductionSuggestion({
                          percent: suggestion.percent,
                          note: language === "fr" ? suggestion.note_fr : suggestion.note_en
                        });
                        setNewExpense(prev => ({ ...prev, deductible_percent: suggestion.percent }));
                      } else {
                        setDeductionSuggestion(null);
                        setNewExpense(prev => ({ ...prev, deductible_percent: null }));
                      }
                    }}
                  >
                    {language === "fr" ? "↩ Réinitialiser à la suggestion" : "↩ Reset to suggestion"}
                  </Button>
                )}
              </div>

              {/* Tax Recoverable Percentage Section */}
              <div className="space-y-2 p-4 border rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tax_recoverable_percent" className="text-sm font-semibold">
                    {language === "fr" ? "Taxes récupérables (%)" : "Tax recoverable (%)"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 text-sm">
                      {language === "fr"
                        ? "Pourcentage des taxes payées sur cette dépense pouvant être récupérées (TPS/TVQ/TVA). Peut différer du pourcentage déductible."
                        : "Percentage of the taxes paid on this expense that can be recovered (GST/QST/VAT). This may differ from the deductible percentage."}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="tax_recoverable_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="100"
                    value={newExpense.tax_recoverable_percent ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Math.min(100, Math.max(0, parseFloat(e.target.value)));
                      setNewExpense({ ...newExpense, tax_recoverable_percent: val });
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {newExpense.tax_recoverable_percent != null && newExpense.taxes.length > 0 && (
                    (() => {
                      const totalTax = newExpense.taxes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                      if (totalTax > 0) {
                        const recoverable = totalTax * (newExpense.tax_recoverable_percent / 100);
                        return (
                          <span className="text-sm text-muted-foreground ml-auto">
                            = ${recoverable.toFixed(2)} {language === "fr" ? "récupérable" : "recoverable"}
                          </span>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
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
                    setNewExpense(prev => ({ ...prev, company_id: value }));
                    
                    // If we have receipt data, apply tax split logic
                    if (receiptData && !taxesUserModified) {
                      applyTaxSplitForCompany(value);
                    } else {
                      // No receipt data - initialize taxes from company and auto-calculate amounts
                      const selectedCompany = companies.find(c => c.id === value);
                      const companyTaxes = selectedCompany?.taxes as any[] || [];
                      const currentAmount = parseFloat(newExpense.amount) || 0;
                      const initialTaxes = companyTaxes.map((tax: any) => ({
                        name: tax.name,
                        percentage: tax.percentage,
                        amount: currentAmount > 0 ? Math.round(currentAmount * tax.percentage) / 100 : 0
                      }));
                      const taxTotal = initialTaxes.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
                      const newTotal = currentAmount + taxTotal;
                      setNewExpense(prev => ({ ...prev, company_id: value, taxes: initialTaxes }));
                      setOriginalReceiptTotal(newTotal);
                      setTotalAmountInput(newTotal > 0 ? newTotal.toFixed(2) : "");
                    }
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
                {/* Helper text when no company selected and receipt scanned */}
                {!newExpense.company_id && receiptData && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {language === "fr" 
                      ? "Sélectionnez une compagnie pour appliquer les règles de taxes"
                      : "Select a company to apply tax rules"}
                  </p>
                )}
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
                      // Mark as user modified if taxes were auto-added
                      if (taxesAutoAdded) {
                        setTaxesUserModified(true);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {language === "fr" ? "Ajouter taxe" : "Add Tax"}
                  </Button>
                </div>
                
                {/* Helper text for auto-added taxes */}
                {taxHelperText && (
                  <div className={`text-xs flex items-center gap-1 ${
                    taxHelperText.type === 'success' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {taxHelperText.type === 'success' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {taxHelperText.text}
                  </div>
                )}
                
                {newExpense.taxes.length === 0 && !taxHelperText && (
                  <p className="text-sm text-muted-foreground">
                    {language === "fr" 
                      ? "Aucune taxe ajoutée. Cliquez sur 'Ajouter taxe' pour inclure TPS, TVQ, etc."
                      : "No taxes added. Click 'Add Tax' to include GST, PST, etc."}
                  </p>
                )}
                
                {newExpense.taxes.map((tax, index) => {
                  // Get company taxes for dynamic options
                  const selectedCompany = companies.find(c => c.id === newExpense.company_id);
                  const companyTaxes = (selectedCompany?.taxes as any[]) || [];
                  
                  // Standard tax options
                  const standardTaxNames = ['TPS', 'TVQ', 'TVH', 'TVP'];
                  
                  // Get company tax names that aren't in the standard list
                  const customTaxNames = companyTaxes
                    .map(t => t.name)
                    .filter(name => !standardTaxNames.includes(name.toUpperCase()));
                  
                  return (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`tax-name-${index}`} className="text-xs">
                        {language === "fr" ? "Nom" : "Name"}
                      </Label>
                      <Select 
                        value={tax.name} 
                        onValueChange={(value) => {
                          const updatedTaxes = [...newExpense.taxes];
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
                          {/* Standard tax options */}
                          <SelectItem value="TPS">TPS (GST)</SelectItem>
                          <SelectItem value="TVQ">TVQ (QST)</SelectItem>
                          <SelectItem value="TVH">TVH (HST)</SelectItem>
                          <SelectItem value="TVP">TVP (PST)</SelectItem>
                          {/* Custom company tax names */}
                          {customTaxNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
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
                          const newPercentage = parseFloat(e.target.value) || 0;
                          const currentAmount = parseFloat(newExpense.amount) || 0;
                          const updatedTaxes = [...newExpense.taxes];
                          updatedTaxes[index] = {
                            ...updatedTaxes[index],
                            percentage: newPercentage,
                            amount: currentAmount > 0 ? Math.round(currentAmount * newPercentage) / 100 : 0
                          };
                          const taxTotal = updatedTaxes.reduce((sum, t) => sum + (t.amount || 0), 0);
                          const newTotal = currentAmount + taxTotal;
                          setNewExpense({...newExpense, taxes: updatedTaxes});
                          setOriginalReceiptTotal(newTotal);
                          setTotalAmountInput(newTotal > 0 ? newTotal.toFixed(2) : "");
                          if (taxesAutoAdded) setTaxesUserModified(true);
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
                          const newAmount = recalculateAmountFromTaxes(updatedTaxes);
                          setNewExpense({
                            ...newExpense, 
                            taxes: updatedTaxes,
                            ...(newAmount !== null ? { amount: newAmount } : {})
                          });
                          if (taxesAutoAdded) setTaxesUserModified(true);
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
                        const newAmount = recalculateAmountFromTaxes(updatedTaxes);
                        setNewExpense({
                          ...newExpense, 
                          taxes: updatedTaxes,
                          ...(newAmount !== null ? { amount: newAmount } : {})
                        });
                        if (taxesAutoAdded) setTaxesUserModified(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )})}

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
            {selectedExpenses.size > 0 && canEditExpenses && (
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
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkArchive}
                >
                  {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                  {showArchived 
                    ? (language === "fr" ? "Désarchiver" : "Unarchive")
                    : (language === "fr" ? "Archiver" : "Archive")}
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
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 pb-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "fr" ? "Rechercher..." : "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder={language === "fr" ? "Catégorie" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "fr" ? "Toutes les catégories" : "All categories"}</SelectItem>
                {categories.filter(cat => cat.for_expenses).map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {getCategoryName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={language === "fr" ? "Statut" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "fr" ? "Tous les statuts" : "All statuses"}</SelectItem>
                <SelectItem value="paid">{t("expenses.paid")}</SelectItem>
                <SelectItem value="unpaid">{t("expenses.unpaid")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger>
                <SelectValue placeholder={language === "fr" ? "Compagnie" : "Company"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "fr" ? "Toutes les compagnies" : "All companies"}</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Created by filter - only show for users who can view all */}
            {canViewAll && uniqueCreators.length > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <User className="h-4 w-4 mr-2" />
                    {filterCreators.length === 0 
                      ? (language === "fr" ? "Créé par" : "Created by")
                      : `${filterCreators.length} ${language === "fr" ? "sélectionné(s)" : "selected"}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-2 border-b mb-2">
                      <span className="text-sm font-medium">
                        {language === "fr" ? "Filtrer par créateur" : "Filter by creator"}
                      </span>
                      {filterCreators.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => setFilterCreators([])}
                        >
                          {language === "fr" ? "Effacer" : "Clear"}
                        </Button>
                      )}
                    </div>
                    {uniqueCreators.map((creator) => (
                      <div 
                        key={creator.userId} 
                        className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => {
                          setFilterCreators(prev => 
                            prev.includes(creator.userId)
                              ? prev.filter(id => id !== creator.userId)
                              : [...prev, creator.userId]
                          );
                        }}
                      >
                        <Checkbox 
                          checked={filterCreators.includes(creator.userId)} 
                          onCheckedChange={() => {}}
                        />
                        <span className="text-sm">
                          {creator.userId === user?.id 
                            ? (language === "fr" ? "Moi" : "Me") 
                            : creator.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {/* Approval filter - only show if user can approve */}
            {canApproveExpenses && (
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "fr" ? "Tous" : "All"}</SelectItem>
                  <SelectItem value="pending">{language === "fr" ? "En attente" : "Pending"}</SelectItem>
                  <SelectItem value="approved">{language === "fr" ? "Approuvés" : "Approved"}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Reset filters button */}
          {(searchTerm || filterCategory !== "all" || filterStatus !== "all" || filterCompany !== "all" || filterCreators.length > 0) && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                  setFilterCompany("all");
                  setFilterCreators([]);
                }}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                {language === "fr" ? "Réinitialiser les filtres" : "Reset filters"}
              </Button>
            </div>
          )}

          {filteredExpenses.length > 0 && canEditExpenses && (
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <Checkbox
                checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {language === "fr" ? "Tout sélectionner" : "Select all"} ({filteredExpenses.length})
              </span>
            </div>
          )}
          <div className="space-y-4">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || filterCategory !== "all" || filterStatus !== "all" || filterCompany !== "all" || filterCreators.length > 0
                  ? (language === "fr" ? "Aucune dépense ne correspond aux filtres" : "No expenses match the filters")
                  : (language === "fr" ? "Aucune dépense trouvée" : "No expenses found")}
              </div>
            ) : filteredExpenses.map((expense) => {
              const expenseCanEdit = canEditExpense(expense);
              const expenseCanDelete = canDeleteExpense(expense);
              const creatorName = expense.profiles?.username || expense.profiles?.display_name || 
                (expense.user_id === user?.id ? (language === "fr" ? "Moi" : "Me") : (language === "fr" ? "Inconnu" : "Unknown"));
              const isApproved = !!(expense as any).approved_at;
              const canApproveThis = canApproveExpenses && expense.user_id !== user?.id; // Can't approve own expenses
              
              return (
                <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {expenseCanEdit && (
                      <Checkbox
                        checked={selectedExpenses.has(expense.id)}
                        onCheckedChange={() => toggleExpenseSelection(expense.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium">{expense.description}</h3>
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status === "paid" ? t("expenses.paid") : t("expenses.unpaid")}
                        </Badge>
                        {/* Approval badge - only show for other users' expenses */}
                        {isApproved ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {language === "fr" ? "Approuvé" : "Approved"}
                            </Badge>
                            {canApproveThis && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => unapproveExpense(expense.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : canViewAll && expense.user_id !== user?.id ? (
                          <Badge variant="secondary">
                            {language === "fr" ? "En attente" : "Pending"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {expense.vendor ? `${expense.vendor} • ` : ""}{getTranslatedCategoryName(expense.category)} • {expense.expense_date}
                        {(expense as any).companies?.name && ` • ${(expense as any).companies.name}`}
                        {` • `}
                        <span className="inline-flex items-center text-xs bg-muted px-1.5 py-0.5 rounded">
                          <User className="h-3 w-3 mr-1" />
                          {creatorName}
                        </span>
                        {isApproved && (expense as any).approved_by_profile && (
                          <span className="text-xs ml-2">
                            • {language === "fr" ? "Approuvé par" : "Approved by"}: {(expense as any).approved_by_profile?.username || (expense as any).approved_by_profile?.display_name}
                          </span>
                        )}
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
                      {(expense as any).deductible_percent != null && (
                        <div className="text-xs text-muted-foreground">
                          {(expense as any).deductible_percent}% {language === "fr" ? "déductible" : "deductible"}
                          {" "}(${(Number(expense.amount) * ((expense as any).deductible_percent / 100)).toFixed(2)})
                        </div>
                      )}
                      {(expense as any).tax_recoverable_percent != null && (expense as any).tax_recoverable_percent !== 100 && ((expense as any).taxes as any[] || []).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {(expense as any).tax_recoverable_percent}% {language === "fr" ? "taxes récupérables" : "tax recoverable"}
                          {" "}(${(((expense as any).taxes as any[] || []).reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0) * ((expense as any).tax_recoverable_percent / 100)).toFixed(2)})
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Approve button */}
                      {canApproveThis && !isApproved && (
                        <Button
                          size="sm"
                          onClick={() => approveExpense(expense.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {language === "fr" ? "Approuver" : "Approve"}
                        </Button>
                      )}
                      {expenseCanEdit ? (
                        <Select value={expense.status} onValueChange={(value) => updateExpense(expense.id, { status: value })}>
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">{t("expenses.unpaid")}</SelectItem>
                            <SelectItem value="paid">{t("expenses.paid")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status === "paid" ? t("expenses.paid") : t("expenses.unpaid")}
                        </Badge>
                      )}
                      {expenseCanEdit && (
                        <Button variant="outline" size="sm" onClick={() => handleEdit(expense)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {expenseCanDelete && (
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
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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