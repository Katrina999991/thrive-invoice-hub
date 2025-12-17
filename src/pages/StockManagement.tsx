import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCompanies } from "@/hooks/useCompanies";
import { useExpenses } from "@/hooks/useExpenses";
import { useSubscription } from "@/hooks/useSubscription";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Package, AlertTriangle, TrendingDown, TrendingUp, Edit2, Lock, ScanBarcode } from "lucide-react";
import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const StockManagement = () => {
  const { t, language } = useLanguage();
  const { products, loading, updateProduct } = useProducts();
  const { categories } = useCategories();
  const { companies } = useCompanies();
  const { createExpense } = useExpenses();
  const { planLimits, isLoading: isLoadingPlan } = useSubscription();
  const navigate = useNavigate();
  
  const hasAccess = planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro';
  
  // Show upgrade message if user doesn't have access
  if (!isLoadingPlan && !hasAccess) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {language === 'fr' ? 'Fonctionnalité Premium' : 'Premium Feature'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' 
                ? 'La gestion des stocks est disponible avec les plans Premium et Pro.' 
                : 'Stock management is available with Premium and Pro plans.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard/settings')}>
              {language === 'fr' ? 'Voir les plans' : 'View Plans'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shouldCreateExpense, setShouldCreateExpense] = useState(false);

  // Filter only products (not services) that have quantity tracking
  const productsWithStock = products.filter(p => p.quantity !== null && p.quantity !== undefined);

  const filteredProducts = productsWithStock.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = filterCompany === "all" || product.company_id === filterCompany;
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    
    let matchesStock = true;
    if (filterStock === "low") {
      matchesStock = (product.quantity || 0) <= 5 && (product.quantity || 0) > 0;
    } else if (filterStock === "out") {
      matchesStock = (product.quantity || 0) === 0;
    } else if (filterStock === "available") {
      matchesStock = (product.quantity || 0) > 5;
    }
    
    return matchesSearch && matchesCompany && matchesCategory && matchesStock;
  });

  const totalProducts = productsWithStock.length;
  const outOfStock = productsWithStock.filter(p => (p.quantity || 0) === 0).length;
  const lowStock = productsWithStock.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) <= 5).length;
  const totalValue = productsWithStock.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost || 0)), 0);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const category = categories.find(c => c.id === categoryId || c.name === categoryId);
    if (!category) return categoryId;
    return language === 'fr' ? (category.name_fr || category.name) : (category.name_en || category.name);
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "-";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "-";
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return { label: language === 'fr' ? 'Rupture' : 'Out of Stock', variant: 'destructive' as const, icon: AlertTriangle };
    } else if (quantity <= 5) {
      return { label: language === 'fr' ? 'Stock bas' : 'Low Stock', variant: 'secondary' as const, icon: TrendingDown };
    }
    return { label: language === 'fr' ? 'En stock' : 'In Stock', variant: 'default' as const, icon: TrendingUp };
  };

  const handleEditStock = (product: any) => {
    setEditingProduct(product);
    setNewQuantity(String(product.quantity || 0));
    setShouldCreateExpense(false);
    setIsDialogOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!editingProduct) return;
    
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Veuillez entrer une quantité valide' : 'Please enter a valid quantity',
        variant: 'destructive'
      });
      return;
    }

    const currentQuantity = editingProduct.quantity || 0;
    const addedQuantity = quantity - currentQuantity;

    try {
      await updateProduct(editingProduct.id, { quantity });
      
      // Create expense if checkbox is checked and quantity increased
      if (shouldCreateExpense && addedQuantity > 0 && editingProduct.cost > 0) {
        const today = new Date().toISOString().split('T')[0];
        const totalCost = editingProduct.cost * addedQuantity;
        
        await createExpense({
          description: language === 'fr' 
            ? `Achat de stock: ${editingProduct.name} (${addedQuantity} ${editingProduct.unit || 'unités'})`
            : `Stock purchase: ${editingProduct.name} (${addedQuantity} ${editingProduct.unit || 'units'})`,
          amount: totalCost,
          category: "Products",
          expense_date: today,
          status: "unpaid",
          company_id: editingProduct.company_id || null
        }, true);
      }
      
      toast({
        title: language === 'fr' ? 'Stock mis à jour' : 'Stock Updated',
        description: language === 'fr' ? 'La quantité a été mise à jour avec succès' : 'Quantity has been updated successfully'
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Impossible de mettre à jour le stock' : 'Failed to update stock',
        variant: 'destructive'
      });
    }
  };

  const addedQuantity = editingProduct ? parseInt(newQuantity || "0") - (editingProduct.quantity || 0) : 0;
  const expenseAmount = editingProduct && addedQuantity > 0 ? (editingProduct.cost || 0) * addedQuantity : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {language === 'fr' ? 'Gestion des stocks' : 'Stock Management'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'fr' ? 'Suivez et gérez l\'inventaire de vos produits' : 'Track and manage your product inventory'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Total produits' : 'Total Products'}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Rupture de stock' : 'Out of Stock'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStock}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Stock bas' : 'Low Stock'}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStock}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Valeur totale' : 'Total Value'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'fr' ? 'Inventaire' : 'Inventory'}</CardTitle>
          <CardDescription>
            {language === 'fr' ? 'Liste de tous vos produits avec suivi de stock' : 'List of all your products with stock tracking'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={language === 'fr' ? 'Rechercher un produit ou code-barres...' : 'Search products or barcode...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <BarcodeScannerButton
                onScan={(barcode) => {
                  // Search for product by barcode/sku
                  const productFound = productsWithStock.find(p => p.sku === barcode);
                  if (productFound) {
                    setSearchTerm(productFound.name);
                    // Ouvrir automatiquement la fenêtre de modification
                    handleEditStock(productFound);
                    toast({
                      title: language === 'fr' ? 'Produit trouvé' : 'Product Found',
                      description: productFound.name
                    });
                  } else {
                    setSearchTerm(barcode);
                    toast({
                      title: language === 'fr' ? 'Produit non trouvé' : 'Product Not Found',
                      description: language === 'fr' 
                        ? `Aucun produit avec le code ${barcode}` 
                        : `No product found with code ${barcode}`,
                      variant: 'destructive'
                    });
                  }
                }}
                variant="outline"
                showLabel={false}
              />
            </div>
            
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={language === 'fr' ? 'Entreprise' : 'Company'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={language === 'fr' ? 'Catégorie' : 'Category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                {categories.filter(c => c.for_products).map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {language === 'fr' ? (category.name_fr || category.name) : (category.name_en || category.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={language === 'fr' ? 'Statut stock' : 'Stock Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                <SelectItem value="available">{language === 'fr' ? 'En stock' : 'In Stock'}</SelectItem>
                <SelectItem value="low">{language === 'fr' ? 'Stock bas' : 'Low Stock'}</SelectItem>
                <SelectItem value="out">{language === 'fr' ? 'Rupture' : 'Out of Stock'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'fr' ? 'Produit' : 'Product'}</TableHead>
                  <TableHead>{language === 'fr' ? 'SKU / Code-barres' : 'SKU / Barcode'}</TableHead>
                  <TableHead>{language === 'fr' ? 'Catégorie' : 'Category'}</TableHead>
                  <TableHead>{language === 'fr' ? 'Entreprise' : 'Company'}</TableHead>
                  <TableHead className="text-center">{language === 'fr' ? 'Quantité' : 'Quantity'}</TableHead>
                  <TableHead>{language === 'fr' ? 'Unité' : 'Unit'}</TableHead>
                  <TableHead className="text-right">{language === 'fr' ? 'Coût unit.' : 'Unit Cost'}</TableHead>
                  <TableHead className="text-right">{language === 'fr' ? 'Valeur' : 'Value'}</TableHead>
                  <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                  <TableHead className="text-right">{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const status = getStockStatus(product.quantity || 0);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.sku ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {product.sku}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getCategoryName(product.category)}</TableCell>
                        <TableCell>{getCompanyName(product.company_id)}</TableCell>
                        <TableCell className="text-center font-medium">{product.quantity || 0}</TableCell>
                        <TableCell>{product.unit || '-'}</TableCell>
                        <TableCell className="text-right">${(product.cost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${((product.quantity || 0) * (product.cost || 0)).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <BarcodeScannerButton
                              onScan={(barcode) => {
                                if (barcode === product.sku) {
                                  handleEditStock(product);
                                  toast({
                                    title: language === 'fr' ? 'Produit trouvé' : 'Product Found',
                                    description: product.name
                                  });
                                } else {
                                  toast({
                                    title: language === 'fr' ? 'Code ne correspond pas' : 'Code Mismatch',
                                    description: language === 'fr' 
                                      ? `Ce code ne correspond pas à ${product.name}` 
                                      : `This code doesn't match ${product.name}`,
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              showLabel={false}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStock(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Modifier le stock' : 'Update Stock'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Quantité actuelle' : 'Current Quantity'}</Label>
              <div className="text-2xl font-bold">{editingProduct?.quantity || 0}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newQuantity">
                {language === 'fr' ? 'Nouvelle quantité' : 'New Quantity'}
              </Label>
              <Input
                id="newQuantity"
                type="number"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
              />
            </div>
            
            {addedQuantity > 0 && editingProduct?.cost > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createExpense"
                      checked={shouldCreateExpense}
                      onCheckedChange={(checked) => setShouldCreateExpense(checked === true)}
                    />
                    <Label htmlFor="createExpense" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'Créer une dépense liée au stock' : 'Create expense linked to stock'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    {language === 'fr' 
                      ? "Cochez cette option si l'augmentation du stock correspond à un achat." 
                      : 'Check this option if the stock increase corresponds to a purchase.'}
                  </p>
                </div>
                {shouldCreateExpense && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <p>
                      {language === 'fr' ? 'Dépense à créer:' : 'Expense to create:'}{' '}
                      <span className="font-medium text-foreground">${expenseAmount.toFixed(2)}</span>
                    </p>
                    <p className="text-xs mt-1">
                      ({addedQuantity} × ${(editingProduct?.cost || 0).toFixed(2)})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdateStock}>
              {language === 'fr' ? 'Mettre à jour' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockManagement;
