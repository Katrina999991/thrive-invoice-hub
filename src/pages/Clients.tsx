
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Phone, Mail, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  contactName: string;
  clientCompany: string;
  serviceProvider: string; // Which of our companies serves this client
  email: string;
  phone: string;
  address?: string;
  status: "active" | "inactive" | "pending";
  totalInvoices: number;
  totalPaid: string;
  lastActivity: string;
}

const Clients = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([
    {
      id: "1",
      contactName: "John Smith",
      clientCompany: "Statis Inc",
      serviceProvider: "Tech Solutions Inc",
      email: "john.smith@statis.com",
      phone: "+1 (555) 123-4567",
      status: "active",
      totalInvoices: 12,
      totalPaid: "$45,230",
      lastActivity: "2024-01-15"
    },
    {
      id: "2",
      contactName: "Sarah Johnson",
      clientCompany: "Innovate Corp",
      serviceProvider: "Tech Solutions Inc",
      email: "sarah.j@innovate.com",
      phone: "+1 (555) 987-6543",
      status: "active",
      totalInvoices: 8,
      totalPaid: "$28,450",
      lastActivity: "2024-01-14"
    },
    {
      id: "3",
      contactName: "Michael Chen",
      clientCompany: "EcoTech Solutions",
      serviceProvider: "Green Energy Corp",
      email: "m.chen@ecotech.com",
      phone: "+1 (555) 555-0123",
      status: "pending",
      totalInvoices: 3,
      totalPaid: "$12,000",
      lastActivity: "2024-01-10"
    },
    {
      id: "4",
      contactName: "Emily Davis",
      clientCompany: "Visual Arts Ltd",
      serviceProvider: "Creative Design Studio",
      email: "emily@visualarts.com",
      phone: "+1 (555) 111-2222",
      status: "inactive",
      totalInvoices: 15,
      totalPaid: "$67,890",
      lastActivity: "2023-12-20"
    }
  ]);

  const [newClient, setNewClient] = useState({
    contactName: "",
    clientCompany: "",
    serviceProvider: "",
    email: "",
    phone: "",
    address: ""
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      // Update existing client
      const updatedClient: Client = {
        ...editingClient,
        contactName: newClient.contactName,
        clientCompany: newClient.clientCompany,
        serviceProvider: newClient.serviceProvider,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address
      };

      setClients(clients.map(client => 
        client.id === editingClient.id ? updatedClient : client
      ));
      
      toast({
        title: "Client Updated",
        description: "The client has been updated successfully."
      });
    } else {
      // Add new client
      const client: Client = {
        id: Date.now().toString(),
        contactName: newClient.contactName,
        clientCompany: newClient.clientCompany,
        serviceProvider: newClient.serviceProvider,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
        status: "active",
        totalInvoices: 0,
        totalPaid: "$0.00",
        lastActivity: new Date().toISOString().split('T')[0]
      };

      setClients([client, ...clients]);
      
      toast({
        title: "Client Added",
        description: "The client has been added successfully."
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewClient({
      contactName: "",
      clientCompany: "",
      serviceProvider: "",
      email: "",
      phone: "",
      address: ""
    });
    setEditingClient(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      contactName: client.contactName,
      clientCompany: client.clientCompany,
      serviceProvider: client.serviceProvider,
      email: client.email,
      phone: client.phone,
      address: client.address
    });
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

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
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="Enter contact name"
                  value={newClient.contactName}
                  onChange={(e) => setNewClient({...newClient, contactName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCompany">Client Company</Label>
                <Input
                  id="clientCompany"
                  placeholder="Enter client company name"
                  value={newClient.clientCompany}
                  onChange={(e) => setNewClient({...newClient, clientCompany: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceProvider">Service Provider</Label>
                <Select value={newClient.serviceProvider} onValueChange={(value) => setNewClient({...newClient, serviceProvider: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tech Solutions Inc">Tech Solutions Inc</SelectItem>
                    <SelectItem value="Green Energy Corp">Green Energy Corp</SelectItem>
                    <SelectItem value="Creative Design Studio">Creative Design Studio</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  required
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
                <TableHead>Contact</TableHead>
                <TableHead>Client Company</TableHead>
                <TableHead>Service Provider</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.contactName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{client.clientCompany}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-primary">{client.serviceProvider}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {client.email}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {client.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(client.status) as any}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.totalInvoices}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {client.totalPaid}
                  </TableCell>
                  <TableCell>{client.lastActivity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
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
