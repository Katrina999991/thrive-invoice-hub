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
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type Invoice = Tables<"invoices"> & {
  clients?: {
    name: string;
    contact_person: string;
    email: string;
  };
  invoice_items?: Array<Tables<"invoice_items"> & {
    products?: {
      name: string;
    };
  }>;
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id?: string;
}

const Invoices = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Database hooks
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { clients } = useClients();
  const { companies } = useCompanies();

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
    due_date: "",
    terms: "",
    notes: "",
    items: [] as InvoiceItem[]
  });

  const [currentItem, setCurrentItem] = useState({
    description: "",
    quantity: 1,
    unit_price: 0,
    product_id: ""
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Filter clients based on selected company
  const filteredClients = selectedCompanyId 
    ? clients.filter(client => client.company_id === selectedCompanyId)
    : clients;

  const generateInvoiceNumber = () => {
    const lastNumber = Math.max(...invoices.map(inv => parseInt(inv.invoice_number.split('-')[1]) || 0));
    return `INV-${String(lastNumber + 1).padStart(3, '0')}`;
  };

  const addItem = () => {
    if (!currentItem.description || currentItem.unit_price <= 0) return;

    const newItem: InvoiceItem = {
      description: currentItem.description,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price,
      total: currentItem.quantity * currentItem.unit_price,
      product_id: currentItem.product_id || undefined
    };

    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });

    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      product_id: ""
    });
  };

  const removeItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    return { totalTax: subtotal * 0.1 }; // 10% tax
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    return subtotal + totalTax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    const subtotal = calculateSubtotal();
    const { totalTax } = calculateTaxes();
    
    if (editingInvoice) {
      // Update existing invoice
      await updateInvoice(editingInvoice.id, {
        client_id: newInvoice.client_id,
        due_date: newInvoice.due_date,
        terms: newInvoice.terms,
        notes: newInvoice.notes,
        subtotal: subtotal,
        tax_amount: totalTax,
        total: totalAmount
      });
    } else {
      // Create new invoice
      await createInvoice({
        invoice_number: generateInvoiceNumber(),
        client_id: newInvoice.client_id,
        due_date: newInvoice.due_date,
        terms: newInvoice.terms,
        notes: newInvoice.notes,
        subtotal: subtotal,
        tax_amount: totalTax,
        total: totalAmount
      }, newInvoice.items);
    }

    // Reset form
    setSelectedCompanyId("");
    setNewInvoice({
      client_id: "",
      due_date: "",
      terms: "",
      notes: "",
      items: []
    });
    setCurrentItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      product_id: ""
    });
    setIsDialogOpen(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setNewInvoice({
      client_id: invoice.client_id || "",
      due_date: invoice.due_date || "",
      terms: invoice.terms || "",
      notes: invoice.notes || "",
      items: []
    });
    setIsDialogOpen(true);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const paidAmount = invoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  if (loading) {
    return <div>Loading...</div>;
  }

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Select Company</Label>
                  <Select 
                    value={selectedCompanyId} 
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      // Reset client selection when company changes
                      setNewInvoice({
                        ...newInvoice,
                        client_id: ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{company.name}</span>
                            {company.contact_person && (
                              <span className="text-sm text-muted-foreground">{company.contact_person}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Select Client</Label>
                  <Select 
                    value={newInvoice.client_id} 
                    onValueChange={(value) => {
                      setNewInvoice({
                        ...newInvoice, 
                        client_id: value
                      });
                    }}
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompanyId ? "Select client" : "Select company first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{client.contact_person}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms</Label>
                  <Input
                    id="terms"
                    placeholder="Payment terms"
                    value={newInvoice.terms}
                    onChange={(e) => setNewInvoice({...newInvoice, terms: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Items</h3>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
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
                  <div className="col-span-3">
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem({...currentItem, unit_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-span-3">
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
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
                            <TableHead>Description</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newInvoice.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell>${item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                           <TableRow>
                             <TableCell colSpan={3} className="text-right font-medium">
                               Subtotal:
                             </TableCell>
                             <TableCell className="font-medium">
                               ${calculateSubtotal().toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                           <TableRow>
                             <TableCell colSpan={3} className="text-right font-medium">
                               Tax (10%):
                             </TableCell>
                             <TableCell className="font-medium">
                               ${calculateTaxes().totalTax.toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                           <TableRow className="border-t-2">
                             <TableCell colSpan={3} className="text-right font-bold">
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
                  setSelectedCompanyId("");
                  setNewInvoice({
                    client_id: "",
                    due_date: "",
                    terms: "",
                    notes: "",
                    items: []
                  });
                  setCurrentItem({
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    product_id: ""
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
                    <p className="text-lg font-semibold">{viewingInvoice.invoice_number}</p>
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
                    <p className="text-lg">
                      {clients.find(c => c.id === viewingInvoice.client_id)?.name || 'Unknown Client'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <p className="text-lg font-semibold">${viewingInvoice.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                    <p>{viewingInvoice.issue_date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p>{viewingInvoice.due_date}</p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                {false && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Items</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingInvoice.invoice_items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                           <TableRow className="bg-muted/30">
                             <TableCell colSpan={3} className="text-right font-medium">
                               Subtotal:
                             </TableCell>
                             <TableCell className="text-right font-medium">
                               ${viewingInvoice.subtotal.toFixed(2)}
                             </TableCell>
                           </TableRow>
                           <TableRow className="bg-muted/30">
                             <TableCell colSpan={3} className="text-right font-medium">
                               Tax:
                             </TableCell>
                             <TableCell className="text-right font-medium">
                               ${viewingInvoice.tax_amount.toFixed(2)}
                             </TableCell>
                           </TableRow>
                           <TableRow className="bg-muted/50 border-t-2">
                             <TableCell colSpan={3} className="text-right font-semibold">
                               Total Amount:
                             </TableCell>
                             <TableCell className="text-right font-bold text-lg">
                               ${viewingInvoice.total.toFixed(2)}
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
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    {clients.find(c => c.id === invoice.client_id)?.name || 'Unknown Client'}
                  </TableCell>
                  <TableCell className="font-medium">${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status) as any}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{invoice.issue_date}</TableCell>
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>0</TableCell>
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