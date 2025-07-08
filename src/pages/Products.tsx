
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Package, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock?: number;
  status: "active" | "inactive";
  type: "product" | "service";
}

const Products = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<Product[]>([
    {
      id: "1",
      name: "Website Development",
      description: "Complete website development service",
      price: "$2,500",
      category: "Web Development",
      status: "active",
      type: "service"
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "Native mobile application development",
      price: "$5,000",
      category: "Mobile Development",
      status: "active",
      type: "service"
    },
    {
      id: "3",
      name: "Software License",
      description: "Annual software license subscription",
      price: "$299",
      category: "Software",
      stock: 50,
      status: "active",
      type: "product"
    },
    {
      id: "4",
      name: "Consulting Hours",
      description: "Technical consulting service per hour",
      price: "$150",
      category: "Consulting",
      status: "active",
      type: "service"
    },
    {
      id: "5",
      name: "Hardware Package",
      description: "Complete hardware setup package",
      price: "$1,200",
      category: "Hardware",
      stock: 15,
      status: "active",
      type: "product"
    }
  ]);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    type: "product" as "product" | "service"
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Update existing item
      const updatedItem: Product = {
        ...editingProduct,
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category,
        stock: newItem.type === "product" ? parseInt(newItem.stock) || 0 : undefined,
        type: newItem.type
      };

      setItems(items.map(item => 
        item.id === editingProduct.id ? updatedItem : item
      ));
      
      toast({
        title: "Item Updated",
        description: `The ${newItem.type} has been updated successfully.`
      });
    } else {
      // Add new item
      const item: Product = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category,
        stock: newItem.type === "product" ? parseInt(newItem.stock) || 0 : undefined,
        status: "active",
        type: newItem.type
      };

      setItems([item, ...items]);
      
      toast({
        title: "Item Added",
        description: `The ${newItem.type} has been added successfully.`
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewItem({
      name: "",
      description: "",
      price: "",
      category: "",
      stock: "",
      type: "product"
    });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewItem({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock?.toString() || "",
      type: product.type
    });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const products = filteredItems.filter(item => item.type === "product");
  const services = filteredItems.filter(item => item.type === "service");

  const ItemCard = ({ item }: { item: Product }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {item.type === "product" ? (
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
          <Badge variant={item.status === "active" ? "default" : "secondary"}>
            {item.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Category</p>
            <p className="font-medium">{item.category}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Price</p>
            <p className="text-xl font-bold text-green-600">{item.price}</p>
          </div>
        </div>

        {item.stock !== undefined && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Stock</p>
            <p className="font-medium">{item.stock} units</p>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Services</h1>
          <p className="text-muted-foreground">
            Manage your products and services catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product or service information." : "Add a new product or service to your catalog."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newItem.type} onValueChange={(value: "product" | "service") => setNewItem({...newItem, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter item description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  placeholder="e.g., $299 or $2,500"
                  value={newItem.price}
                  onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Web Development">Web Development</SelectItem>
                    <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newItem.type === "product" && (
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="Enter stock quantity"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingProduct ? "Update Item" : `Add ${newItem.type === "product" ? "Product" : "Service"}`}
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
            placeholder="Search products and services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Items ({filteredItems.length})</TabsTrigger>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
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
            {products.map((item) => (
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
