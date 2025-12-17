
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Package, Wrench, Loader2, X, Percent, ExternalLink, ScanBarcode } from "lucide-react";
import { Link } from "react-router-dom";
import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanies } from "@/hooks/useCompanies";
import { useClients } from "@/hooks/useClients";



const Products = () => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { createExpense } = useExpenses();
  const { companies, loading: companiesLoading } = useCompanies();
  const { clients, loading: clientsLoading } = useClients();

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

  const [newItem, setNewItem] = useState({
    type: "product", // product or service
    name: "",
    description: "",
    price: "",
    cost: "",
    category: "",
    quantity: "",
    unit: "piece",
    company_id: "",
    client_id: "",
    sku: ""
  });

  const [taxes, setTaxes] = useState<Array<{name: string, type: 'percentage' | 'amount', value: number}>>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const addTax = () => {
    setTaxes([...taxes, { name: "", type: 'percentage', value: 0 }]);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: 'name' | 'type' | 'value', value: string | number) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItem.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive"
      });
      return;
    }

    if (newItem.type === "product" && parseFloat(newItem.cost) <= 0) {
      toast({
        title: "Error",
        description: "Le prix coûtant d'un produit doit être supérieur à 0$",
        variant: "destructive"
      });
      return;
    }

    if (newItem.cost && parseFloat(newItem.price) < parseFloat(newItem.cost)) {
      toast({
        title: "Error",
        description: "Le prix de vente doit être égal ou supérieur au prix coûtant",
        variant: "destructive"
      });
      return;
    }
    
    const itemData = {
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price) || 0,
      cost: parseFloat(newItem.cost) || 0,
      category: newItem.category,
      quantity: newItem.type === "service" ? null : (parseInt(newItem.quantity) || 0),
      unit: newItem.unit,
      taxes: taxes.length > 0 ? taxes : [],
      company_id: newItem.company_id || null,
      client_id: newItem.client_id || null,
      sku: newItem.sku || null
    };
    
    if (editingProduct) {
      await updateProduct(editingProduct.id, itemData);
    } else {
      await createProduct(itemData);
      
      // Créer automatiquement une dépense si le produit a un coût
      if (itemData.cost > 0) {
        const today = new Date().toISOString().split('T')[0];
        const quantity = itemData.quantity || 1;
        const totalCost = itemData.cost * quantity;
        
        await createExpense({
          description: `Achat de produit: ${itemData.name} (${quantity} ${itemData.unit})`,
          amount: totalCost,
          category: "Products",
          expense_date: today,
          status: "unpaid"
        }, true); // Skip limit check for automatic product expenses
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setNewItem({
      type: "product",
      name: "",
      description: "",
      price: "",
      cost: "",
      category: "",
      quantity: "",
      unit: "piece",
      company_id: "",
      client_id: "",
      sku: ""
    });
    setTaxes([]);
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setNewItem({
      type: product.quantity !== null ? "product" : "service",
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      category: product.category || "",
      quantity: product.quantity?.toString() || "",
      unit: product.unit || "piece",
      company_id: product.company_id || "",
      client_id: product.client_id || "",
      sku: product.sku || ""
    });
    // Handle taxes - parse JSON if it exists and migrate old format
    if (product.taxes && Array.isArray(product.taxes)) {
      const migratedTaxes = product.taxes.map((tax: any) => {
        // Migrate old format {name, percentage} to new format {name, type, value}
        if ('percentage' in tax && !('type' in tax)) {
          return { name: tax.name, type: 'percentage' as const, value: tax.percentage };
        }
        return tax;
      });
      setTaxes(migratedTaxes);
    } else {
      setTaxes([]);
    }
    setIsDialogOpen(true);
  };

  const filteredItems = products.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsWithStock = filteredItems.filter(item => item.quantity !== null);
  const services = filteredItems.filter(item => item.quantity === null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const ItemCard = ({ item }: { item: any }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {item.quantity !== null ? (
                <Package className="h-5 w-5 text-primary" />
              ) : (
                <Wrench className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </div>
          </div>
          <Badge variant={item.is_active ? "default" : "secondary"}>
            {item.is_active ? t("products.active") : t("products.inactive")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("products.category")}</p>
              <p className="font-medium">{getTranslatedCategoryName(item.category) || "—"}</p>
            </div>
            {item.companies && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === "fr" ? "Compagnie" : "Company"}
                </p>
                <p className="font-medium">{item.companies.name}</p>
              </div>
            )}
            {item.clients && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {language === "fr" ? "Client" : "Client"}
                </p>
                <p className="font-medium">{item.clients.name}</p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("products.salePrice2")}</p>
              <p className="text-xl font-bold text-green-600">
                ${item.price}
                {item.quantity === null && item.unit && (
                  <span className="text-sm">
                    /{item.unit === "hour" 
                      ? (language === "fr" ? "heure" : "hour") 
                      : item.unit === "day" 
                        ? (language === "fr" ? "jour" : "day")
                        : item.unit}
                  </span>
                )}
              </p>
            </div>
            {item.cost > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">{t("products.cost")}</p>
                <p className="text-sm text-orange-600">${item.cost}</p>
              </div>
            )}
          </div>
        </div>

        {item.quantity !== null && (
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("products.stock")}</p>
              <p className="font-medium">{item.quantity} {item.unit}</p>
            </div>
            {item.sku && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">SKU</p>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {item.sku}
                </code>
              </div>
            )}
          </div>
        )}

        {item.taxes && Array.isArray(item.taxes) && item.taxes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("companies.taxesLabel")}</p>
            <div className="space-y-1">
              {item.taxes.map((tax: any, index: number) => {
                // Handle both old and new format
                const taxName = tax.name;
                const taxType = tax.type || 'percentage';
                const taxValue = tax.value !== undefined ? tax.value : tax.percentage;
                
                return (
                  <div key={index} className="flex items-center text-sm text-muted-foreground">
                    {taxType === 'percentage' ? (
                      <Percent className="h-4 w-4 mr-2" />
                    ) : (
                      <span className="h-4 w-4 mr-2 flex items-center">$</span>
                    )}
                    {taxName}: {taxType === 'percentage' ? `${taxValue}%` : `$${taxValue}`}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
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
                <AlertDialogTitle>{t("products.delete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("products.deleteConfirm").replace('"{name}"', `"${item.name}"`)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("products.cancel")}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteProduct(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("products.deleteButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("products.title")}</h1>
          <p className="text-muted-foreground">
            {t("products.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingProduct(null);
              setNewItem({
                type: "product",
                name: "",
                description: "",
                price: "",
                cost: "",
                category: "",
                quantity: "",
                unit: "piece",
                company_id: "",
                client_id: "",
                sku: ""
              });
              setTaxes([]);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("products.addButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t("products.dialog.edit") : t("products.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingProduct ? t("products.dialog.editDesc") : t("products.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t("products.type")}</Label>
                <Select 
                  value={newItem.type} 
                  onValueChange={(value) => setNewItem({
                    ...newItem, 
                    type: value,
                    quantity: value === "service" ? "" : newItem.quantity,
                    unit: value === "service" ? "hour" : "piece"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("products.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">{t("products.product")}</SelectItem>
                    <SelectItem value="service">{t("products.service")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("products.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t("products.namePlaceholder")}
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("products.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("products.descPlaceholder")}
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              {newItem.type === "product" && (
                <div className="space-y-2">
                  <Label htmlFor="sku">
                    {language === "fr" ? "Code-barres / SKU" : "Barcode / SKU"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="sku"
                      placeholder={language === "fr" ? "Ex: 012345678905" : "E.g.: 012345678905"}
                      value={newItem.sku}
                      onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                      className="flex-1"
                    />
                    <BarcodeScannerButton
                      onScan={(barcode) => setNewItem({...newItem, sku: barcode})}
                      variant="outline"
                      size="default"
                      showLabel={false}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">
                    {t("products.costPrice")} {newItem.type === "product" && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItem.cost}
                    onChange={(e) => setNewItem({...newItem, cost: e.target.value})}
                    required={newItem.type === "product"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    {newItem.type === "service" 
                      ? (language === "fr" ? "Prix de l'heure" : "Hourly rate")
                      : t("products.salePrice")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    required
                  />
                </div>
              </div>
              {newItem.type === "product" && (
                <div className="space-y-2">
                  <Label htmlFor="company">
                    {language === "fr" ? "Compagnie" : "Company"}
                  </Label>
                  <Select value={newItem.company_id} onValueChange={(value) => setNewItem({...newItem, company_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "fr" ? "Sélectionner une compagnie (optionnel)" : "Select a company (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {language === "fr" ? "Aucune compagnie. " : "No companies. "}
                          <Link to="/companies" className="text-primary hover:underline inline-flex items-center gap-1">
                            {language === "fr" ? "Créer une compagnie" : "Create a company"}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newItem.type === "service" && (
                <div className="space-y-2">
                  <Label htmlFor="client">
                    {language === "fr" ? "Client" : "Client"}
                  </Label>
                  <Select value={newItem.client_id} onValueChange={(value) => setNewItem({...newItem, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "fr" ? "Sélectionner un client (optionnel)" : "Select a client (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {language === "fr" ? "Aucun client. " : "No clients. "}
                          <Link to="/clients" className="text-primary hover:underline inline-flex items-center gap-1">
                            {language === "fr" ? "Créer un client" : "Create a client"}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="category">
                  {t("products.category")} <span className="text-destructive">*</span>
                </Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("products.categoryPlaceholder")} />
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
                         .filter(cat => newItem.type === "product" ? cat.for_products : cat.for_services)
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
              {newItem.type === "product" && (
                <div className="space-y-2">
                  <Label htmlFor="unit">{t("products.unit")}</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({...newItem, unit: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("products.unitPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">{t("products.unitPiece")}</SelectItem>
                      <SelectItem value="hour">{t("products.unitHour")}</SelectItem>
                      <SelectItem value="day">{t("products.unitDay")}</SelectItem>
                      <SelectItem value="month">{t("products.unitMonth")}</SelectItem>
                      <SelectItem value="year">{t("products.unitYear")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {newItem.type === "service" && (
                <div className="space-y-2">
                  <Label htmlFor="service-unit">{t("products.unit")}</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({...newItem, unit: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("products.unitPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">{t("products.unitHour")}</SelectItem>
                      <SelectItem value="day">{t("products.unitDay")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("companies.taxes")}</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addTax}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("companies.addTax")}
                  </Button>
                </div>
                {taxes.map((tax, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`tax-name-${index}`}>{t("companies.taxName")}</Label>
                      <Input
                        id={`tax-name-${index}`}
                        placeholder={t("companies.taxNamePlaceholder")}
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Label htmlFor={`tax-type-${index}`}>Type</Label>
                      <Select 
                        value={tax.type} 
                        onValueChange={(value: 'percentage' | 'amount') => updateTax(index, 'type', value)}
                      >
                        <SelectTrigger id={`tax-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="amount">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`tax-value-${index}`}>
                        {tax.type === 'percentage' ? t("companies.taxRate") : 'Montant'}
                      </Label>
                      <Input
                        id={`tax-value-${index}`}
                        type="number"
                        step="0.01"
                        placeholder={tax.type === 'percentage' ? t("companies.taxRatePlaceholder") : "0.00"}
                        value={tax.value}
                        onChange={(e) => updateTax(index, 'value', parseFloat(e.target.value))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTax(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {t("products.cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {editingProduct ? t("products.updateButton") : t("products.addItem")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("products.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t("products.allItems")} ({filteredItems.length})</TabsTrigger>
          <TabsTrigger value="products">{t("products.products")} ({productsWithStock.length})</TabsTrigger>
          <TabsTrigger value="services">{t("products.services")} ({services.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {productsWithStock.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products;
