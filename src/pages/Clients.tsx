
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Phone, Mail, Building, Loader2, Languages, X, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { z } from "zod";


const Clients = () => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { clients, loading, createClient, updateClient, deleteClient } = useClients();
  const { companies } = useCompanies();
  const { checkLimit, planLimits } = useSubscription();
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitMessage, setLimitMessage] = useState({ limit: 0 });

  const [newClient, setNewClient] = useState({
    name: "",
    contact_person: "",
    company_id: "",
    email: "",
    phone: "",
    address: "",
    language: "english",
    hourly_rate: 0,
    notes: "",
    created_at: new Date().toISOString().split('T')[0],
    include_payment_link: false,
    send_overdue_email_auto: false
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [emailList, setEmailList] = useState<string[]>([""]);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState({ title: "", description: "" });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    
    // Validation: vérifier que le nom est renseigné
    if (!newClient.name || newClient.name.trim() === "") {
      setValidationErrorMessage({
        title: language === 'fr' ? "Nom requis" : "Name required",
        description: language === 'fr' ? "Veuillez entrer un nom pour le client" : "Please enter a name for the client"
      });
      setShowValidationError(true);
      return;
    }
    
    // Validation: vérifier qu'une compagnie est sélectionnée
    if (!newClient.company_id || newClient.company_id.trim() === "") {
      setValidationErrorMessage({
        title: language === 'fr' ? "Compagnie requise" : "Company required",
        description: language === 'fr' ? "Veuillez sélectionner une compagnie" : "Please select a company"
      });
      setShowValidationError(true);
      return;
    }
    
    // Combiner les emails en une seule chaîne séparée par des virgules
    const emailsString = emailList.filter(email => email.trim() !== "").join(", ");
    
    // Validation: vérifier qu'au moins un email est renseigné
    if (!emailsString) {
      setValidationErrorMessage({
        title: language === 'fr' ? "Email requis" : "Email required",
        description: language === 'fr' ? "Veuillez entrer au moins un email" : "Please enter at least one email"
      });
      setShowValidationError(true);
      return;
    }

    // Validation: vérifier le format des emails
    const emailSchema = z.string().email();
    for (const email of emailList) {
      if (email.trim()) {
        try {
          emailSchema.parse(email.trim());
        } catch (error) {
          setValidationErrorMessage({
            title: language === 'fr' ? "Email invalide" : "Invalid email",
            description: language === 'fr' ? "Veuillez entrer une adresse email valide" : "Please enter a valid email address"
          });
          setShowValidationError(true);
          return;
        }
      }
    }

    // Validation: vérifier le format du téléphone si renseigné
    if (newClient.phone && newClient.phone.trim()) {
      const phoneSchema = z.string().regex(
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
      );
      try {
        phoneSchema.parse(newClient.phone.trim());
      } catch (error) {
        setValidationErrorMessage({
          title: language === 'fr' ? "Téléphone invalide" : "Invalid phone",
          description: language === 'fr' ? "Veuillez entrer un numéro de téléphone valide" : "Please enter a valid phone number"
        });
        setShowValidationError(true);
        return;
      }
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
        hourly_rate: newClient.hourly_rate,
        notes: newClient.notes,
        include_payment_link: newClient.include_payment_link,
        send_overdue_email_auto: newClient.send_overdue_email_auto
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
        notes: newClient.notes,
        created_at: newClient.created_at,
        include_payment_link: newClient.include_payment_link,
        send_overdue_email_auto: newClient.send_overdue_email_auto
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
      notes: "",
      created_at: new Date().toISOString().split('T')[0],
      include_payment_link: false,
      send_overdue_email_auto: false
    });
    setEmailList([""]);
    setEditingClient(null);
    setIsDialogOpen(false);
    setAttemptedSubmit(false);
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
      notes: client.notes || "",
      created_at: client.created_at ? new Date(client.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      include_payment_link: client.include_payment_link || false,
      send_overdue_email_auto: client.send_overdue_email_auto || false
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

  const handleAddClientClick = async () => {
    const { canAdd, current, limit } = await checkLimit('clients');
    
    if (!canAdd && limit !== null) {
      setLimitMessage({ limit });
      setShowLimitDialog(true);
      return;
    }
    
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
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Limite atteinte" : "Limit Reached"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr"
                ? `Vous avez atteint la limite de ${limitMessage.limit} clients pour votre plan. Veuillez mettre à niveau votre abonnement pour ajouter plus de clients.`
                : `You have reached the limit of ${limitMessage.limit} clients for your plan. Please upgrade your subscription to add more clients.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/dashboard/pricing")}>
              {language === "fr" ? "Voir les plans" : "View Plans"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("clients.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("clients.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAddClientClick} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t("clients.addButton")}
          </Button>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? t("clients.dialog.edit") : t("clients.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingClient ? t("clients.dialog.editDesc") : t("clients.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("clients.name")} *</Label>
                <Input
                  id="name"
                  placeholder={t("clients.namePlaceholder")}
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  className={attemptedSubmit && (!newClient.name || newClient.name.trim() === '') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {attemptedSubmit && (!newClient.name || newClient.name.trim() === '') && (
                  <p className="text-xs text-red-500">{language === 'fr' ? 'Le nom est requis' : 'Name is required'}</p>
                )}
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
                >
                  <SelectTrigger className={attemptedSubmit && (!newClient.company_id || newClient.company_id.trim() === '') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
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
                {attemptedSubmit && (!newClient.company_id || newClient.company_id.trim() === '') && (
                  <p className="text-xs text-red-500">{language === 'fr' ? 'La compagnie est requise' : 'Company is required'}</p>
                )}
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
                      className={attemptedSubmit && index === 0 && (!email || email.trim() === '') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
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
                {attemptedSubmit && emailList.every(e => !e || e.trim() === '') && (
                  <p className="text-xs text-red-500">{language === 'fr' ? 'Au moins un email est requis' : 'At least one email is required'}</p>
                )}
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
                  type="tel"
                  pattern="[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}"
                  placeholder={t("clients.phonePlaceholder")}
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  title={t("clients.validation.phoneInvalid")}
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
                <Label htmlFor="notes">{t("clients.notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("clients.notesPlaceholder")}
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  rows={3}
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_payment_link"
                  checked={newClient.include_payment_link}
                  onCheckedChange={(checked) => setNewClient({...newClient, include_payment_link: !!checked})}
                />
                <Label htmlFor="include_payment_link" className="text-sm font-normal cursor-pointer">
                  {language === "fr" 
                    ? "Inclure automatiquement le lien de paiement dans les emails de facture" 
                    : "Automatically include payment link in invoice emails"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_overdue_email_auto"
                  checked={newClient.send_overdue_email_auto}
                  onCheckedChange={(checked) => setNewClient({...newClient, send_overdue_email_auto: !!checked})}
                />
                <Label htmlFor="send_overdue_email_auto" className="text-sm font-normal cursor-pointer">
                  {language === "fr" 
                    ? "Envoyer automatiquement un email de rappel 1 jour après la date d'échéance" 
                    : "Automatically send reminder email 1 day after due date"}
                </Label>
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

      <div className="flex items-center">
        <div className="relative flex-1 sm:max-w-sm">
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
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredClients.map((client, index) => {
              const isOverLimit = planLimits && planLimits.max_clients !== null && index >= planLimits.max_clients;
              
              return (
                <Card key={client.id} className={`${isOverLimit ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{client.name}</span>
                        {client.send_overdue_email_auto && (
                          <Badge variant="secondary" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {language === "fr" ? "Rappel" : "Reminder"}
                          </Badge>
                        )}
                        {isOverLimit && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/50 text-xs">
                            {language === "fr" ? "Hors limite" : "Over Limit"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
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
                    </div>
                    
                    {client.contact_person && (
                      <p className="text-sm text-muted-foreground">{client.contact_person}</p>
                    )}
                    
                    {client.companies?.name && (
                      <Badge variant="outline" className="text-primary">
                        {client.companies.name}
                      </Badge>
                    )}
                    
                    <div className="flex flex-col gap-1 text-sm">
                      {client.email && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="h-3 w-3 mr-2" />
                          <span className="truncate">{client.email.split(",")[0].trim()}</span>
                          {client.email.includes(",") && <span className="ml-1">+{client.email.split(",").length - 1}</span>}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="h-3 w-3 mr-2" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        <Languages className="h-3 w-3 mr-1" />
                        {client.language === 'french' ? 'FR' : 'EN'}
                      </Badge>
                      <span className="text-sm font-medium">${client.hourly_rate || 0}/hr</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredClients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {language === "fr" ? "Aucun client trouvé" : "No clients found"}
              </p>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table autoWidth>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-auto">{t("clients.tableClientName")}</TableHead>
                  <TableHead className="w-auto whitespace-nowrap">{t("clients.tableContactPerson")}</TableHead>
                  <TableHead className="w-auto whitespace-nowrap">{t("clients.tableServiceProvider")}</TableHead>
                  <TableHead className="w-auto">{t("clients.tableContactInfo")}</TableHead>
                  <TableHead className="w-auto whitespace-nowrap">{t("clients.tableLanguage")}</TableHead>
                  <TableHead className="w-auto whitespace-nowrap">{t("clients.tableHourlyRate")}</TableHead>
                  <TableHead className="w-auto text-right whitespace-nowrap">{t("clients.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => {
                  const isOverLimit = planLimits && planLimits.max_clients !== null && index >= planLimits.max_clients;
                  
                  return (
                    <TableRow key={client.id} className={isOverLimit ? 'bg-orange-500/5' : ''}>
                       <TableCell className="whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Building className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                           <span className="font-medium">{client.name}</span>
                           {client.send_overdue_email_auto && (
                             <Badge variant="secondary" className="text-xs whitespace-nowrap">
                               <Bell className="h-3 w-3 mr-1" />
                               {language === "fr" ? "Rappel auto" : "Auto reminder"}
                             </Badge>
                           )}
                           {isOverLimit && (
                             <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/50 text-xs whitespace-nowrap">
                               {language === "fr" ? "Hors limite" : "Over Limit"}
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{client.contact_person || "—"}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
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
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="flex items-center w-fit">
                        <Languages className="h-3 w-3 mr-1" />
                        {client.language === 'french' ? 'Français' : 'English'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">${client.hourly_rate || 0}/hr</span>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Error Dialog */}
      <AlertDialog open={showValidationError} onOpenChange={setShowValidationError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{validationErrorMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>{validationErrorMessage.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationError(false)}>
              {language === "fr" ? "Compris" : "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
