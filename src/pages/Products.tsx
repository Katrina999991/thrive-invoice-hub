
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, Package, Wrench } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [items] = useState<Product[]>([
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
          <Button variant="outline" size="sm">
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
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
