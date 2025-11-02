import { useState } from "react";
import { Plus, Edit, Trash2, Package, Briefcase, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/hooks/useLanguage";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export default function Categories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    for_products: true,
    for_services: true,
    for_expenses: true
  });

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        color: category.color || "#3b82f6",
        for_products: category.for_products ?? true,
        for_services: category.for_services ?? true,
        for_expenses: category.for_expenses ?? true
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6",
        for_products: true,
        for_services: true,
        for_expenses: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      for_products: true,
      for_services: true,
      for_expenses: true
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      handleCloseDialog();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete.id);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const colorOptions = [
    { value: "#3b82f6", label: language === "fr" ? "Bleu" : "Blue" },
    { value: "#10b981", label: language === "fr" ? "Vert" : "Green" },
    { value: "#f59e0b", label: language === "fr" ? "Orange" : "Orange" },
    { value: "#ef4444", label: language === "fr" ? "Rouge" : "Red" },
    { value: "#8b5cf6", label: language === "fr" ? "Violet" : "Purple" },
    { value: "#ec4899", label: language === "fr" ? "Rose" : "Pink" },
    { value: "#6b7280", label: language === "fr" ? "Gris" : "Gray" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {language === "fr" ? "Catégories" : "Categories"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "fr" 
              ? "Gérez vos catégories de produits et services" 
              : "Manage your product and service categories"}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {language === "fr" ? "Nouvelle catégorie" : "New Category"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: category.color || "#3b82f6" }}
                  />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
              <div className="flex gap-2 flex-wrap">
                {category.for_products && (
                  <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    <Package className="h-3 w-3" />
                    {language === "fr" ? "Produits" : "Products"}
                  </div>
                )}
                {category.for_services && (
                  <div className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                    <Briefcase className="h-3 w-3" />
                    {language === "fr" ? "Services" : "Services"}
                  </div>
                )}
                {category.for_expenses && (
                  <div className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    <Receipt className="h-3 w-3" />
                    {language === "fr" ? "Dépenses" : "Expenses"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {language === "fr" 
                  ? "Aucune catégorie trouvée" 
                  : "No categories found"}
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {language === "fr" ? "Créer votre première catégorie" : "Create your first category"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? (language === "fr" ? "Modifier la catégorie" : "Edit Category")
                : (language === "fr" ? "Nouvelle catégorie" : "New Category")}
            </DialogTitle>
            <DialogDescription>
              {language === "fr"
                ? "Remplissez les informations de la catégorie"
                : "Fill in the category information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {language === "fr" ? "Nom" : "Name"} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === "fr" ? "Ex: Électronique" : "Ex: Electronics"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {language === "fr" ? "Description" : "Description"}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === "fr" 
                  ? "Description de la catégorie" 
                  : "Category description"}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {language === "fr" ? "Couleur" : "Color"}
              </Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: option.value })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === option.value 
                        ? "border-primary scale-110" 
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>
                {language === "fr" ? "Utiliser pour" : "Use for"}
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="for_products"
                    checked={formData.for_products}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, for_products: checked === true })
                    }
                  />
                  <label
                    htmlFor="for_products"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    {language === "fr" ? "Produits" : "Products"}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="for_services"
                    checked={formData.for_services}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, for_services: checked === true })
                    }
                  />
                  <label
                    htmlFor="for_services"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    {language === "fr" ? "Services" : "Services"}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="for_expenses"
                    checked={formData.for_expenses}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, for_expenses: checked === true })
                    }
                  />
                  <label
                    htmlFor="for_expenses"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Receipt className="h-4 w-4" />
                    {language === "fr" ? "Dépenses" : "Expenses"}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving 
                ? (language === "fr" ? "Sauvegarde..." : "Saving...") 
                : (language === "fr" ? "Sauvegarder" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Confirmer la suppression" : "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr"
                ? `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete?.name}" ? Cette action ne peut pas être annulée.`
                : `Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {language === "fr" ? "Supprimer" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
