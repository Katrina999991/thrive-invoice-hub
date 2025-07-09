import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, X, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/useCompanies";
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;

const Companies = () => {
  const { toast } = useToast();
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();

  const [newCompany, setNewCompany] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    tax_id: "",
    default_due_days: 7
  });

  const [taxes, setTaxes] = useState<Array<{name: string, percentage: number}>>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const addTax = () => {
    if (taxes.length < 2) {
      setTaxes([...taxes, { name: "", percentage: 0 }]);
    }
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyData = {
      name: newCompany.name,
      address: newCompany.address || null,
      phone: newCompany.phone || null,
      email: newCompany.email || null,
      website: newCompany.website || null,
      tax_id: newCompany.tax_id || null,
      taxes: taxes.length > 0 ? taxes : [],
      default_due_days: newCompany.default_due_days
    };
    
    if (editingCompany) {
      await updateCompany(editingCompany.id, companyData);
    } else {
      await createCompany(companyData);
    }

    resetForm();
  };

  const resetForm = () => {
    setNewCompany({
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      tax_id: "",
      default_due_days: 7
    });
    setTaxes([]);
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setNewCompany({
      name: company.name,
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      tax_id: company.tax_id || "",
      default_due_days: company.default_due_days || 7
    });
    // Handle taxes - parse JSON if it exists
    if (company.taxes && Array.isArray(company.taxes)) {
      setTaxes(company.taxes as Array<{name: string, percentage: number}>);
    } else {
      setTaxes([]);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (companyId: string) => {
    await deleteCompany(companyId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage your business companies and organizations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
              <DialogDescription>
                {editingCompany ? "Update company information." : "Add a new company to your business management system."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  placeholder="Enter company name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter company address"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="Enter website URL"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  placeholder="Enter tax identification number"
                  value={newCompany.tax_id}
                  onChange={(e) => setNewCompany({...newCompany, tax_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_due_days">Default Due Days</Label>
                <Input
                  id="default_due_days"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="7"
                  value={newCompany.default_due_days}
                  onChange={(e) => setNewCompany({...newCompany, default_due_days: parseInt(e.target.value) || 7})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Taxes (Max 2)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addTax}
                    disabled={taxes.length >= 2}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tax
                  </Button>
                </div>
                {taxes.map((tax, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`tax-name-${index}`}>Tax Name</Label>
                      <Input
                        id={`tax-name-${index}`}
                        placeholder="e.g. GST, VAT"
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`tax-percentage-${index}`}>%</Label>
                      <Input
                        id={`tax-percentage-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.0001"
                        placeholder="0"
                        value={tax.percentage}
                        onChange={(e) => {
                          const value = e.target.value.replace(',', '.');
                          updateTax(index, 'percentage', parseFloat(value) || 0);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTax(index)}
                      className="mb-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingCompany ? "Update Company" : "Add Company"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription>Company</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {company.address && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {company.address}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    {company.email}
                  </div>
                )}
              </div>

              {(company.website || company.tax_id || (company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0)) && (
                <div className="pt-4 border-t space-y-2">
                  {company.website && (
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <p className="text-sm text-muted-foreground">{company.website}</p>
                    </div>
                  )}
                  {company.tax_id && (
                    <div>
                      <p className="text-sm font-medium">Tax ID</p>
                      <p className="text-sm text-muted-foreground">{company.tax_id}</p>
                    </div>
                  )}
                  {company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Taxes</p>
                      <div className="space-y-1">
                        {(company.taxes as Array<{name: string, percentage: number}>).map((tax, index) => (
                          <div key={index} className="flex items-center text-sm text-muted-foreground">
                            <Percent className="h-4 w-4 mr-2" />
                            {tax.name}: {tax.percentage}%
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(company)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(company.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Companies;