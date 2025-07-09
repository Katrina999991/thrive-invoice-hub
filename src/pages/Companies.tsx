
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, X, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tax {
  name: string;
  percentage: number;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  employees: number;
  revenue: string;
  defaultPaymentTerms: string;
  taxes: Tax[];
}

const Companies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: "1",
      name: "Tech Solutions Inc",
      industry: "Technology",
      address: "123 Tech Street, Silicon Valley, CA",
      phone: "+1 (555) 123-4567",
      email: "contact@techsolutions.com",
      status: "active",
      employees: 150,
      revenue: "$2.5M",
      defaultPaymentTerms: "30",
      taxes: [
        { name: "VAT", percentage: 21 },
        { name: "Service Tax", percentage: 5 }
      ]
    },
    {
      id: "2", 
      name: "Green Energy Corp",
      industry: "Renewable Energy",
      address: "456 Green Ave, Austin, TX",
      phone: "+1 (555) 987-6543",
      email: "info@greenenergy.com",
      status: "active",
      employees: 89,
      revenue: "$1.8M",
      defaultPaymentTerms: "15",
      taxes: [
        { name: "GST", percentage: 18 }
      ]
    },
    {
      id: "3",
      name: "Creative Design Studio",
      industry: "Design",
      address: "789 Art District, NYC, NY",
      phone: "+1 (555) 555-0123",
      email: "hello@creativedesign.com",
      status: "inactive",
      employees: 25,
      revenue: "$450K",
      defaultPaymentTerms: "45",
      taxes: []
    }
  ]);

  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    address: "",
    phone: "",
    email: "",
    employees: "",
    revenue: "",
    defaultPaymentTerms: "30",
    taxes: [] as Tax[]
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCompany) {
      // Update existing company
      const updatedCompany: Company = {
        ...editingCompany,
        name: newCompany.name,
        industry: newCompany.industry,
        address: newCompany.address,
        phone: newCompany.phone,
        email: newCompany.email,
        employees: parseInt(newCompany.employees) || 0,
        revenue: newCompany.revenue,
        defaultPaymentTerms: newCompany.defaultPaymentTerms,
        taxes: newCompany.taxes
      };

      setCompanies(companies.map(company => 
        company.id === editingCompany.id ? updatedCompany : company
      ));
      
      toast({
        title: "Company Updated",
        description: "The company has been updated successfully."
      });
    } else {
      // Add new company
      const company: Company = {
        id: Date.now().toString(),
        name: newCompany.name,
        industry: newCompany.industry,
        address: newCompany.address,
        phone: newCompany.phone,
        email: newCompany.email,
        status: "active",
        employees: parseInt(newCompany.employees) || 0,
        revenue: newCompany.revenue,
        defaultPaymentTerms: newCompany.defaultPaymentTerms,
        taxes: newCompany.taxes
      };

      setCompanies([company, ...companies]);
      
      toast({
        title: "Company Added",
        description: "The company has been added successfully."
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewCompany({
      name: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      employees: "",
      revenue: "",
      defaultPaymentTerms: "30",
      taxes: []
    });
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setNewCompany({
      name: company.name,
      industry: company.industry,
      address: company.address,
      phone: company.phone,
      email: company.email,
      employees: company.employees.toString(),
      revenue: company.revenue,
      defaultPaymentTerms: company.defaultPaymentTerms,
      taxes: [...company.taxes]
    });
    setIsDialogOpen(true);
  };

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
                <Label htmlFor="industry">Industry</Label>
                <Select value={newCompany.industry} onValueChange={(value) => setNewCompany({...newCompany, industry: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter company address"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                  required
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employees">Number of Employees</Label>
                <Input
                  id="employees"
                  type="number"
                  placeholder="Enter number of employees"
                  value={newCompany.employees}
                  onChange={(e) => setNewCompany({...newCompany, employees: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue">Annual Revenue</Label>
                <Input
                  id="revenue"
                  placeholder="e.g., $1.2M"
                  value={newCompany.revenue}
                  onChange={(e) => setNewCompany({...newCompany, revenue: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
                <Select value={newCompany.defaultPaymentTerms} onValueChange={(value) => setNewCompany({...newCompany, defaultPaymentTerms: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Net 7 days</SelectItem>
                    <SelectItem value="15">Net 15 days</SelectItem>
                    <SelectItem value="30">Net 30 days</SelectItem>
                    <SelectItem value="45">Net 45 days</SelectItem>
                    <SelectItem value="60">Net 60 days</SelectItem>
                    <SelectItem value="0">Due on receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Taxes (Max 2)</Label>
                {newCompany.taxes.map((tax, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`tax-name-${index}`}>Tax Name</Label>
                      <Input
                        id={`tax-name-${index}`}
                        placeholder="e.g., VAT, GST"
                        value={tax.name}
                        onChange={(e) => {
                          const updatedTaxes = [...newCompany.taxes];
                          updatedTaxes[index].name = e.target.value;
                          setNewCompany({...newCompany, taxes: updatedTaxes});
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`tax-percentage-${index}`}>%</Label>
                      <Input
                        id={`tax-percentage-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0.00"
                        value={tax.percentage}
                        onChange={(e) => {
                          const updatedTaxes = [...newCompany.taxes];
                          updatedTaxes[index].percentage = parseFloat(e.target.value) || 0;
                          setNewCompany({...newCompany, taxes: updatedTaxes});
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedTaxes = newCompany.taxes.filter((_, i) => i !== index);
                        setNewCompany({...newCompany, taxes: updatedTaxes});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {newCompany.taxes.length < 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewCompany({
                        ...newCompany,
                        taxes: [...newCompany.taxes, { name: "", percentage: 0 }]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tax
                  </Button>
                )}
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
                    <CardDescription>{company.industry}</CardDescription>
                  </div>
                </div>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>
                  {company.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {company.address}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  {company.phone}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  {company.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium">Employees</p>
                  <p className="text-lg font-semibold">{company.employees}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Revenue</p>
                  <p className="text-lg font-semibold text-green-600">{company.revenue}</p>
                </div>
              </div>

              {company.taxes.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Taxes</p>
                  </div>
                  <div className="space-y-1">
                    {company.taxes.map((tax, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tax.name}</span>
                        <span className="font-medium">{tax.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
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
