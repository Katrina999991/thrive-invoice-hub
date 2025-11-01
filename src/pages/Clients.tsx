
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Phone, Mail, Building, Loader2, Languages, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useLanguage } from "@/hooks/useLanguage";


const Clients = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const { clients, loading, createClient, updateClient, deleteClient } = useClients();
  const { companies } = useCompanies();

  const [newClient, setNewClient] = useState({
    name: "",
    contact_person: "",
    company_id: "",
    email: "",
    phone: "",
    address: "",
    language: "english",
    hourly_rate: 0,
    created_at: new Date().toISOString().split('T')[0]
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [emailList, setEmailList] = useState<string[]>([""]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: vérifier qu'une compagnie est sélectionnée
    if (!newClient.company_id || newClient.company_id.trim() === "") {
      toast({
        title: t("clients.validation.error"),
        description: t("clients.validation.companyRequired"),
        variant: "destructive"
      });
      return;
    }
    
    // Combiner les emails en une seule chaîne séparée par des virgules
    const emailsString = emailList.filter(email => email.trim() !== "").join(", ");
    
    // Validation: vérifier qu'au moins un email est renseigné
    if (!emailsString) {
      toast({
        title: t("clients.validation.error"),
        description: t("clients.validation.emailRequired"),
        variant: "destructive"
      });
      return;
    }
    
    if (editingClient) {
      await updateClient(editingClient.id, {
        name: newClient.name,
        contact_person: newClient.contact_person,
        company_id: newClient.company_id || null,
        email: emailsString,
        phone: newClient.phone,
        address: newClient.address,
        language: newClient.language,
        hourly_rate: newClient.hourly_rate
      });
    } else {
      await createClient({
        name: newClient.name,
        contact_person: newClient.contact_person,
        company_id: newClient.company_id || null,
        email: emailsString,
        phone: newClient.phone,
        address: newClient.address,
        language: newClient.language,
        hourly_rate: newClient.hourly_rate,
        created_at: newClient.created_at
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
      address: "",
      language: "english",
      hourly_rate: 0,
      created_at: new Date().toISOString().split('T')[0]
    });
    setEmailList([""]);
    setEditingClient(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    // Séparer les emails s'il y en a plusieurs
    const emails = client.email ? client.email.split(",").map((e: string) => e.trim()) : [""];
    setEmailList(emails.length > 0 ? emails : [""]);
    
    setNewClient({
      name: client.name,
      contact_person: client.contact_person || "",
      company_id: client.company_id || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      language: client.language || "english",
      hourly_rate: client.hourly_rate || 0,
      created_at: client.created_at ? new Date(client.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const addEmailField = () => {
    setEmailList([...emailList, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emailList.length > 1) {
      const newList = emailList.filter((_, i) => i !== index);
      setEmailList(newList);
    }
  };

  const updateEmailField = (index: number, value: string) => {
    const newList = [...emailList];
    newList[index] = value;
    setEmailList(newList);
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
          <h1 className="text-3xl font-bold tracking-tight">{t("clients.title")}</h1>
          <p className="text-muted-foreground">
            {t("clients.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("clients.addButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? t("clients.dialog.edit") : t("clients.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingClient ? t("clients.dialog.editDesc") : t("clients.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("clients.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("clients.namePlaceholder")}
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">{t("clients.contactPerson")}</Label>
                <Input
                  id="contact_person"
                  placeholder={t("clients.contactPlaceholder")}
                  value={newClient.contact_person}
                  onChange={(e) => setNewClient({...newClient, contact_person: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_id">{t("clients.serviceProvider")} *</Label>
                <Select 
                  value={newClient.company_id} 
                  onValueChange={(value) => setNewClient({...newClient, company_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("clients.serviceProviderPlaceholder")} />
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
                <Label>{t("clients.emails")} *</Label>
                {emailList.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={t("clients.emailPlaceholder")}
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                      required={index === 0}
                    />
                    {emailList.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEmailField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("clients.addEmail")}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("clients.phone")}</Label>
                <Input
                  id="phone"
                  placeholder={t("clients.phonePlaceholder")}
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("clients.address")}</Label>
                <Input
                  id="address"
                  placeholder={t("clients.addressPlaceholder")}
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">{t("clients.language")}</Label>
                <Select value={newClient.language} onValueChange={(value) => setNewClient({...newClient, language: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("clients.languagePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">
                      <div className="flex items-center">
                        <Languages className="h-4 w-4 mr-2" />
                        English
                      </div>
                    </SelectItem>
                    <SelectItem value="french">
                      <div className="flex items-center">
                        <Languages className="h-4 w-4 mr-2" />
                        Français
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">{t("clients.hourlyRate")}</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  placeholder={t("clients.hourlyPlaceholder")}
                  value={newClient.hourly_rate}
                  onChange={(e) => setNewClient({...newClient, hourly_rate: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="created_at">{t("clients.creationDate")}</Label>
                <Input
                  id="created_at"
                  type="date"
                  value={newClient.created_at}
                  onChange={(e) => setNewClient({...newClient, created_at: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {t("clients.cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {editingClient ? t("clients.updateButton") : t("clients.addClient")}
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
            placeholder={t("clients.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("clients.listTitle")}</CardTitle>
          <CardDescription>
            {t("clients.listDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("clients.tableClientName")}</TableHead>
                <TableHead>{t("clients.tableContactPerson")}</TableHead>
                <TableHead>{t("clients.tableServiceProvider")}</TableHead>
                <TableHead>{t("clients.tableContactInfo")}</TableHead>
                <TableHead>{t("clients.tableAddress")}</TableHead>
                <TableHead>{t("clients.tableLanguage")}</TableHead>
                <TableHead>{t("clients.tableHourlyRate")}</TableHead>
                <TableHead>{t("clients.tableCreated")}</TableHead>
                <TableHead className="text-right">{t("clients.tableActions")}</TableHead>
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
                        <div className="text-sm">
                          {client.email.split(",").map((email: string, i: number) => (
                            <div key={i} className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {email.trim()}
                            </div>
                          ))}
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
                  <TableCell>
                    <Badge variant="outline" className="flex items-center w-fit">
                      <Languages className="h-3 w-3 mr-1" />
                      {client.language === 'french' ? 'Français' : 'English'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${client.hourly_rate || 0}/hr</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("clients.delete")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("clients.deleteConfirm").replace("{name}", client.name)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("clients.cancel")}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteClient(client.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("clients.deleteButton")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
