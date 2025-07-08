
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
  name: string;
  company: string;
  email: string;
  phone: string;
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
      name: "John Smith",
      company: "ABC Corporation",
      email: "john.smith@abc.com",
      phone: "+1 (555) 123-4567",
      status: "active",
      totalInvoices: 12,
      totalPaid: "$45,230",
      lastActivity: "2024-01-15"
    },
    {
      id: "2",
      name: "Sarah Johnson",
      company: "XYZ Industries",
      email: "sarah.j@xyz.com",
      phone: "+1 (555) 987-6543",
      status: "active",
      totalInvoices: 8,
      totalPaid: "$28,450",
      lastActivity: "2024-01-14"
    },
    {
      id: "3",
      name: "Michael Chen",
      company: "Tech Startup Inc",
      email: "m.chen@techstartup.com",
      phone: "+1 (555) 555-0123",
      status: "pending",
      totalInvoices: 3,
      totalPaid: "$12,000",
      lastActivity: "2024-01-10"
    },
    {
      id: "4",
      name: "Emily Davis",
      company: "Design Studio LLC",
      email: "emily@designstudio.com",
      phone: "+1 (555) 111-2222",
      status: "inactive",
      totalInvoices: 15,
      totalPaid: "$67,890",
      lastActivity: "2023-12-20"
    }
  ]);

  const [newClient, setNewClient] = useState({
    name: "",
    company: "",
    email: "",
    phone: ""
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const client: Client = {
      id: Date.now().toString(),
      name: newClient.name,
      company: newClient.company,
      email: newClient.email,
      phone: newClient.phone,
      status: "active",
      totalInvoices: 0,
      totalPaid: "$0",
      lastActivity: new Date().toISOString().split('T')[0]
    };

    setClients([client, ...clients]);
    setNewClient({
      name: "",
      company: "",
      email: "",
      phone: ""
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Client Added",
      description: "The client has been added successfully."
    });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Add a new client to your customer database.
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
                <Label htmlFor="company">Company</Label>
                <Select value={newClient.company} onValueChange={(value) => setNewClient({...newClient, company: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABC Corporation">ABC Corporation</SelectItem>
                    <SelectItem value="XYZ Industries">XYZ Industries</SelectItem>
                    <SelectItem value="Tech Startup Inc">Tech Startup Inc</SelectItem>
                    <SelectItem value="Design Studio LLC">Design Studio LLC</SelectItem>
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
              <Button type="submit" className="w-full">
                Add Client
              </Button>
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
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
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
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Building className="h-3 w-3 mr-1" />
                        {client.company}
                      </div>
                    </div>
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
                      <Button variant="outline" size="sm">
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
