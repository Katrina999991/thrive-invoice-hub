
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Phone, Mail, Building, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";


const Clients = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const { clients, loading, createClient, updateClient, deleteClient } = useClients();
  const { companies } = useCompanies();

  const [newClient, setNewClient] = useState({
    name: "",
    contact_person: "",
    company_id: "",
    email: "",
    phone: "",
    address: ""
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      await updateClient(editingClient.id, {
        name: newClient.name,
        contact_person: newClient.contact_person,
        company_id: newClient.company_id || null,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address
      });
    } else {
      await createClient({
        name: newClient.name,
        contact_person: newClient.contact_person,
        company_id: newClient.company_id || null,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewClient({
      name: "",
      contact_person: "",
      company_id: "",
      email: "",
      phone: "",
      address: ""
    });
    setEditingClient(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      contact_person: client.contact_person || "",
      company_id: client.company_id || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || ""
    });
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your clients and customer relationships
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Update client information." : "Add a new client to your customer database."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  placeholder="Enter client name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  placeholder="Enter contact person name"
                  value={newClient.contact_person}
                  onChange={(e) => setNewClient({...newClient, contact_person: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_id">Service Provider</Label>
                <Select value={newClient.company_id} onValueChange={(value) => setNewClient({...newClient, company_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service provider" />
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingClient ? "Update Client" : "Add Client"}
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
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>
            A comprehensive list of all your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Service Provider</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{client.contact_person || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-primary">
                      {client.companies?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.email && (
                        <div className="text-sm flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.address || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteClient(client.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
