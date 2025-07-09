
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Download, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceItem {
  id: string;
  productService: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  issueDate: string;
  items: number;
  itemDetails?: InvoiceItem[];
}

const Invoices = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Helper function to generate sample items for existing invoices
  const generateSampleItems = (invoiceId: string, itemCount: number): InvoiceItem[] => {
    const sampleItems = {
      "1": [
        { id: "1-1", productService: "Web Development", description: "Frontend development services", quantity: 40, unitPrice: 50, total: 2000 },
        { id: "1-2", productService: "UI Design", description: "User interface design", quantity: 20, unitPrice: 25, total: 500 },
      ],
      "2": [
        { id: "2-1", productService: "Consultation", description: "Technical consultation", quantity: 15, unitPrice: 120, total: 1800 },
      ],
      "3": [
        { id: "3-1", productService: "Full Stack Development", description: "Complete web application", quantity: 1, unitPrice: 5000, total: 5000 },
      ],
      "4": [
        { id: "4-1", productService: "Logo Design", description: "Brand logo creation", quantity: 1, unitPrice: 800, total: 800 },
        { id: "4-2", productService: "Business Cards", description: "Design and printing", quantity: 500, unitPrice: 2, total: 1000 },
        { id: "4-3", productService: "Website Mockup", description: "Initial design concepts", quantity: 3, unitPrice: 400, total: 1200 },
        { id: "4-4", productService: "SEO Setup", description: "Search engine optimization", quantity: 1, unitPrice: 200, total: 200 },
      ]
    };
    return sampleItems[invoiceId as keyof typeof sampleItems] || [];
  };

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: "1",
      number: "INV-001",
      client: "ABC Corporation",
      amount: "$2,500.00",
      status: "paid",
      dueDate: "2024-01-15",
      issueDate: "2024-01-01",
      items: 2,
      itemDetails: generateSampleItems("1", 2)
    },
    {
      id: "2",
      number: "INV-002",
      client: "XYZ Industries",
      amount: "$1,800.00",
      status: "sent",
      dueDate: "2024-01-20",
      issueDate: "2024-01-05",
      items: 1,
      itemDetails: generateSampleItems("2", 1)
    },
    {
      id: "3",
      number: "INV-003",
      client: "Tech Startup Inc",
      amount: "$5,000.00",
      status: "overdue",
      dueDate: "2024-01-10",
      issueDate: "2023-12-25",
      items: 1,
      itemDetails: generateSampleItems("3", 1)
    },
    {
      id: "4",
      number: "INV-004",
      client: "Design Studio LLC",
      amount: "$3,200.00",
      status: "draft",
      dueDate: "2024-01-25",
      issueDate: "2024-01-15",
      items: 4,
      itemDetails: generateSampleItems("4", 4)
    }
  ]);

  const [newInvoice, setNewInvoice] = useState({
    client: "",
    dueDate: "",
    paymentTerms: "30",
    items: [] as InvoiceItem[]
  });

  const [currentItem, setCurrentItem] = useState({
    productService: "",
    description: "",
    quantity: 1,
    unitPrice: 0
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const generateInvoiceNumber = () => {
    const lastNumber = Math.max(...invoices.map(inv => parseInt(inv.number.split('-')[1]) || 0));
    return `INV-${String(lastNumber + 1).padStart(3, '0')}`;
  };

  const addItem = () => {
    if (!currentItem.productService || currentItem.unitPrice <= 0) return;

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productService: currentItem.productService,
      description: currentItem.description,
      quantity: currentItem.quantity,
      unitPrice: currentItem.unitPrice,
      total: currentItem.quantity * currentItem.unitPrice
    };

    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });

    setCurrentItem({
      productService: "",
      description: "",
      quantity: 1,
      unitPrice: 0
    });
  };

  const removeItem = (itemId: string) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter(item => item.id !== itemId)
    });
  };

  const calculateTotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newInvoice.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the invoice.",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = calculateTotal();
    
    if (editingInvoice) {
      // Update existing invoice
      const updatedInvoice: Invoice = {
        ...editingInvoice,
        client: newInvoice.client,
        amount: `$${totalAmount.toFixed(2)}`,
        dueDate: newInvoice.dueDate,
        items: newInvoice.items.length,
        itemDetails: newInvoice.items
      };

      setInvoices(invoices.map(invoice => 
        invoice.id === editingInvoice.id ? updatedInvoice : invoice
      ));
      
      toast({
        title: "Invoice Updated",
        description: `Invoice ${updatedInvoice.number} has been updated successfully.`
      });
    } else {
      // Create new invoice
      const invoice: Invoice = {
        id: Date.now().toString(),
        number: generateInvoiceNumber(),
        client: newInvoice.client,
        amount: `$${totalAmount.toFixed(2)}`,
        status: "draft",
        dueDate: newInvoice.dueDate,
        issueDate: new Date().toISOString().split('T')[0],
        items: newInvoice.items.length,
        itemDetails: newInvoice.items
      };

      setInvoices([invoice, ...invoices]);
      
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoice.number} has been created successfully.`
      });
    }

    // Reset form
    setNewInvoice({
      client: "",
      dueDate: "",
      paymentTerms: "30",
      items: []
    });
    setCurrentItem({
      productService: "",
      description: "",
      quantity: 1,
      unitPrice: 0
    });
    setIsDialogOpen(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setNewInvoice({
      client: invoice.client,
      dueDate: invoice.dueDate,
      paymentTerms: "30", // Default since we don't store this in the invoice
      items: [] // Would need to fetch actual items for full editing
    });
    setIsDialogOpen(true);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "outline";
      case "overdue": return "destructive";
      case "draft": return "secondary";
      default: return "secondary";
    }
  };

  const totalAmount = invoices.reduce((sum, invoice) => {
    return sum + parseFloat(invoice.amount.replace('$', '').replace(',', ''));
  }, 0);

  const paidAmount = invoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => {
      return sum + parseFloat(invoice.amount.replace('$', '').replace(',', ''));
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage your invoices
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
              <DialogDescription>
                {editingInvoice ? "Update invoice information." : "Create a new invoice with multiple products or services."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={newInvoice.client} onValueChange={(value) => {
                    // Company default payment terms mapping
                    const companyDefaults: Record<string, string> = {
                      "ABC Corporation": "30",
                      "XYZ Industries": "15", 
                      "Tech Startup Inc": "45",
                      "Design Studio LLC": "30"
                    };
                    
                    const defaultTerms = companyDefaults[value] || "30";
                    const issueDate = new Date();
                    const dueDate = new Date(issueDate);
                    dueDate.setDate(dueDate.getDate() + parseInt(defaultTerms));
                    
                    setNewInvoice({
                      ...newInvoice, 
                      client: value,
                      paymentTerms: defaultTerms,
                      dueDate: dueDate.toISOString().split('T')[0]
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABC Corporation">ABC Corporation</SelectItem>
                      <SelectItem value="XYZ Industries">XYZ Industries</SelectItem>
                      <SelectItem value="Tech Startup Inc">Tech Startup Inc</SelectItem>
                      <SelectItem value="Design Studio LLC">Design Studio LLC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select 
                    value={newInvoice.paymentTerms} 
                    onValueChange={(value) => {
                      const issueDate = new Date();
                      const dueDate = new Date(issueDate);
                      dueDate.setDate(dueDate.getDate() + parseInt(value));
                      
                      setNewInvoice({
                        ...newInvoice, 
                        paymentTerms: value,
                        dueDate: dueDate.toISOString().split('T')[0]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
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
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Items</h3>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label htmlFor="productService">Product/Service</Label>
                    <Input
                      id="productService"
                      placeholder="Enter item name"
                      value={currentItem.productService}
                      onChange={(e) => setCurrentItem({...currentItem, productService: e.target.value})}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Item description"
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="unitPrice">Unit Price</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={currentItem.unitPrice}
                      onChange={(e) => setCurrentItem({...currentItem, unitPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {newInvoice.items.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Invoice Items</h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product/Service</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newInvoice.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productService}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell>${item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Total Amount:
                            </TableCell>
                            <TableCell className="font-bold text-lg">
                              ${calculateTotal().toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setNewInvoice({
                    client: "",
                    dueDate: "",
                    paymentTerms: "30",
                    items: []
                  });
                  setCurrentItem({
                    productService: "",
                    description: "",
                    quantity: 1,
                    unitPrice: 0
                  });
                  setEditingInvoice(null);
                  setIsDialogOpen(false);
                }} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={newInvoice.items.length === 0}>
                  {editingInvoice ? "Update Invoice" : "Create Invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                View invoice information
              </DialogDescription>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
                    <p className="text-lg font-semibold">{viewingInvoice.number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(viewingInvoice.status) as any}>
                        {viewingInvoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                    <p className="text-lg">{viewingInvoice.client}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <p className="text-lg font-semibold">{viewingInvoice.amount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                    <p>{viewingInvoice.issueDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p>{viewingInvoice.dueDate}</p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                {viewingInvoice.itemDetails && viewingInvoice.itemDetails.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Items</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product/Service</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingInvoice.itemDetails.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productService}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="text-right font-semibold">
                              Total Amount:
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              {viewingInvoice.amount}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${(totalAmount - paidAmount).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            Manage all your invoices in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{invoice.client}</TableCell>
                  <TableCell className="font-medium">{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status) as any}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{invoice.issueDate}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>{invoice.items}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setViewingInvoice(invoice);
                        setIsViewDialogOpen(true);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status === "draft" && (
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
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

export default Invoices;
