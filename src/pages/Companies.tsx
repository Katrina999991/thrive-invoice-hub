
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail } from "lucide-react";

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
}

const Companies = () => {
  const [companies] = useState<Company[]>([
    {
      id: "1",
      name: "Tech Solutions Inc",
      industry: "Technology",
      address: "123 Tech Street, Silicon Valley, CA",
      phone: "+1 (555) 123-4567",
      email: "contact@techsolutions.com",
      status: "active",
      employees: 150,
      revenue: "$2.5M"
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
      revenue: "$1.8M"
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
      revenue: "$450K"
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage your business companies and organizations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
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

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" size="sm">
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
