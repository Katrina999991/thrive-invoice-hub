import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, FileText, Trash2, Pencil, Filter } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useInvoices } from "@/hooks/useInvoices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

const timeEntrySchema = z.object({
  client_id: z.string().min(1, "Le client est requis"),
  company_id: z.string().optional(),
  service_id: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  hours: z.string().min(1, "Les heures sont requises"),
  hourly_rate: z.string().min(1, "Le taux horaire est requis"),
  date: z.string().min(1, "La date est requise"),
  notes: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

export default function TimeTracking() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { timeEntries, loading, createTimeEntry, updateTimeEntry, deleteTimeEntry, getUnbilledEntries, markAsBilled, markAsUnbilled } = useTimeEntries();
  const { clients } = useClients();
  const { companies } = useCompanies();
  const { products } = useProducts();
  const { createInvoice } = useInvoices();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [useCustomDescription, setUseCustomDescription] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useSEO({
    title: language === "fr" ? "Suivi des heures" : "Time Tracking",
    description: language === "fr" 
      ? "Suivez vos heures de travail et créez des factures"
      : "Track your working hours and create invoices",
  });

  const services = products.filter(p => p.is_active && p.quantity === null);

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      hourly_rate: "",
      description: "",
      service_id: "",
      notes: "",
    },
  });

  // Fonction pour ouvrir le dialog et pré-remplir avec le premier service
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    // Pré-sélectionner le premier service
    if (services.length > 0) {
      setTimeout(() => {
        form.setValue("service_id", services[0].id);
        form.setValue("description", services[0].name);
        if (services[0].price) {
          form.setValue("hourly_rate", services[0].price.toString());
        }
      }, 0);
    }
  };

  const onSubmit = async (data: TimeEntryFormData) => {
    if (editingEntry) {
      await updateTimeEntry(editingEntry, {
        client_id: data.client_id,
        company_id: data.company_id || null,
        description: data.description,
        hours: parseFloat(data.hours),
        hourly_rate: parseFloat(data.hourly_rate),
        date: data.date,
        notes: data.notes || null,
      });
    } else {
      await createTimeEntry({
        client_id: data.client_id,
        company_id: data.company_id || null,
        description: data.description,
        hours: parseFloat(data.hours),
        hourly_rate: parseFloat(data.hourly_rate),
        date: data.date,
        notes: data.notes || null,
      });
    }
    setIsDialogOpen(false);
    setEditingEntry(null);
    setUseCustomDescription(false);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      hourly_rate: "",
      description: "",
      service_id: "",
      notes: "",
    });
  };

  const handleEdit = (entry: typeof timeEntries[0]) => {
    setEditingEntry(entry.id);
    form.reset({
      client_id: entry.client_id || "",
      company_id: entry.company_id || "",
      description: entry.description,
      hours: entry.hours.toString(),
      hourly_rate: entry.hourly_rate.toString(),
      date: entry.date,
      notes: entry.notes || "",
      service_id: "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setUseCustomDescription(false);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      hourly_rate: "",
      description: "",
      service_id: "",
      notes: "",
    });
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client?.hourly_rate) {
      form.setValue("hourly_rate", client.hourly_rate.toString());
    }
  };

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "custom") {
      setUseCustomDescription(true);
      form.setValue("description", "");
    } else {
      setUseCustomDescription(false);
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        form.setValue("description", service.name);
        if (service.price) {
          form.setValue("hourly_rate", service.price.toString());
        }
      }
    }
  };

  const handleCreateInvoice = async () => {
    if (selectedEntries.length === 0) return;

    setIsCreatingInvoice(true);
    try {
      const entries = timeEntries.filter((e) => selectedEntries.includes(e.id));
      const clientId = entries[0].client_id;
      
      // Get client to find company_id
      const client = clients.find(c => c.id === clientId);
      
      if (!client?.company_id) {
        toast({
          title: language === "fr" ? "Erreur" : "Error",
          description: language === "fr" 
            ? "Le client doit être associé à une entreprise pour créer une facture."
            : "The client must be associated with a company to create an invoice.",
          variant: "destructive"
        });
        setIsCreatingInvoice(false);
        return;
      }
      
      // Generate invoice number using the company's settings
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { company_id: client.company_id });

      if (numberError) {
        console.error("Error generating invoice number:", numberError);
        toast({
          title: language === "fr" ? "Erreur" : "Error",
          description: language === "fr" 
            ? "Erreur lors de la génération du numéro de facture."
            : "Error generating invoice number.",
          variant: "destructive"
        });
        setIsCreatingInvoice(false);
        return;
      }
      
      // Get company to find default_due_days and taxes
      const company = companies.find(c => c.id === client.company_id);
      const dueDays = company?.default_due_days || 7;
      
      // Calculate dates
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + dueDays);
      
      // Get company taxes
      const companyTaxes = (company?.taxes as any[]) || [];
      
      const items = entries.map((entry) => {
        // Parse date without timezone issues
        const [year, month, day] = entry.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        
        return {
          description: `${entry.description} - ${format(localDate, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })}`,
          quantity: entry.hours,
          unit_price: entry.hourly_rate,
          total: entry.hours * entry.hourly_rate,
          notes: entry.notes || null,
          product_taxes: companyTaxes.length > 0 ? companyTaxes : null,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      
      // Calculate total tax rate from company taxes
      const totalTaxRate = companyTaxes.reduce((sum: number, tax: any) => {
        return sum + (tax.percentage || 0);
      }, 0);
      
      const taxAmount = (subtotal * totalTaxRate) / 100;
      const total = subtotal + taxAmount;

      const invoice = await createInvoice(
        {
          client_id: clientId,
          invoice_number: invoiceNumber,
          issue_date: issueDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          subtotal,
          tax_rate: totalTaxRate,
          tax_amount: taxAmount,
          total: total,
          status: "draft",
        },
        items,
        true
      );

      if (invoice) {
        await markAsBilled(selectedEntries, invoice.id);
        setSelectedEntries([]);
        navigate("/dashboard/invoices");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Erreur lors de la création de la facture."
          : "Error creating invoice.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const toggleSelection = (id: string) => {
    const entry = timeEntries.find(e => e.id === id);
    if (!entry) return;

    setSelectedEntries((prev) => {
      // Si on désélectionne, on retire simplement
      if (prev.includes(id)) {
        return prev.filter((e) => e !== id);
      }

      // Si c'est la première sélection, on l'ajoute
      if (prev.length === 0) {
        return [id];
      }

      // Vérifier que le client est le même que les autres entrées sélectionnées
      const firstSelectedEntry = timeEntries.find(e => e.id === prev[0]);
      if (firstSelectedEntry && entry.client_id !== firstSelectedEntry.client_id) {
        // Afficher un message d'erreur
        toast({
          title: language === "fr" ? "Client différent" : "Different client",
          description: language === "fr" 
            ? "Vous ne pouvez sélectionner que des heures du même client pour créer une facture."
            : "You can only select hours from the same client to create an invoice.",
          variant: "destructive"
        });
        return prev; // Ne pas ajouter l'entrée
      }

      return [...prev, id];
    });
  };

  // Obtenir le client sélectionné pour désactiver les autres
  const selectedClientId = selectedEntries.length > 0 
    ? timeEntries.find(e => e.id === selectedEntries[0])?.client_id 
    : null;

  // Filtrer les entrées
  const filteredEntries = timeEntries.filter((entry) => {
    // Filtre par client
    if (filterClient !== "all" && entry.client_id !== filterClient) {
      return false;
    }
    
    // Filtre par date
    if (dateRange?.from) {
      const entryDate = new Date(entry.date);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (entryDate < fromDate) {
        return false;
      }
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Obtenir les entrées non facturées filtrées
  const unbilledFilteredEntries = filteredEntries.filter(entry => !entry.is_billed);

  // Vérifier si toutes les entrées non facturées du même client sont sélectionnées
  const allSameClientSelected = selectedClientId 
    ? unbilledFilteredEntries.filter(e => e.client_id === selectedClientId).every(e => selectedEntries.includes(e.id))
    : unbilledFilteredEntries.every(e => selectedEntries.includes(e.id));
  
  const someSelected = selectedEntries.length > 0 && !allSameClientSelected;

  const handleSelectAll = () => {
    if (unbilledFilteredEntries.length === 0) return;
    
    if (allSameClientSelected && selectedEntries.length > 0) {
      // Tout désélectionner
      setSelectedEntries([]);
    } else {
      // Sélectionner toutes les entrées non facturées du premier client ou toutes si aucune sélection
      const firstClientId = selectedClientId || unbilledFilteredEntries[0]?.client_id;
      const entriesToSelect = unbilledFilteredEntries
        .filter(e => !firstClientId || e.client_id === firstClientId)
        .map(e => e.id);
      setSelectedEntries(entriesToSelect);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {language === "fr" ? "Suivi des heures" : "Time Tracking"}
          </h1>
          <p className="text-muted-foreground">
            {language === "fr"
              ? "Enregistrez vos heures et créez des factures"
              : "Track your hours and create invoices"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedEntries.length > 0 && (
            <Button onClick={handleCreateInvoice} disabled={isCreatingInvoice}>
              <FileText className="mr-2 h-4 w-4" />
              {language === "fr" ? "Créer une facture" : "Create Invoice"} ({selectedEntries.length})
            </Button>
          )}
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {language === "fr" ? "Ajouter des heures" : "Add Hours"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {language === "fr" ? "Heures enregistrées" : "Recorded Hours"}
          </CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Tous les clients" : "All clients"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "fr" ? "Tous les clients" : "All clients"}
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })} -{" "}
                        {format(dateRange.to, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })}
                      </>
                    ) : (
                      format(dateRange.from, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })
                    )
                  ) : (
                    <span>{language === "fr" ? "Sélectionner une période" : "Pick a date range"}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    // Fermer le popover si les deux dates sont sélectionnées
                    if (range?.from && range?.to) {
                      setIsDatePickerOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {(filterClient !== "all" || dateRange) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterClient("all");
                  setDateRange(undefined);
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                {language === "fr" ? "Réinitialiser" : "Reset"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr" ? "Chargement..." : "Loading..."}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr"
                ? "Aucune heure enregistrée"
                : "No hours recorded"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSameClientSelected && selectedEntries.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label={language === "fr" ? "Tout sélectionner" : "Select all"}
                      disabled={unbilledFilteredEntries.length === 0}
                      className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                      {...(someSelected && { "data-state": "indeterminate" })}
                    />
                  </TableHead>
                  <TableHead>{language === "fr" ? "Date" : "Date"}</TableHead>
                  <TableHead>{language === "fr" ? "Client" : "Client"}</TableHead>
                  <TableHead>{language === "fr" ? "Description" : "Description"}</TableHead>
                  <TableHead className="text-right">{language === "fr" ? "Heures" : "Hours"}</TableHead>
                  <TableHead className="text-right">{language === "fr" ? "Taux" : "Rate"}</TableHead>
                  <TableHead className="text-right">{language === "fr" ? "Total" : "Total"}</TableHead>
                  <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {!entry.is_billed && (
                        <Checkbox
                          checked={selectedEntries.includes(entry.id)}
                          onCheckedChange={() => toggleSelection(entry.id)}
                          disabled={selectedClientId !== null && entry.client_id !== selectedClientId}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const [year, month, day] = entry.date.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        return format(localDate, "d MMM yyyy", {
                          locale: language === "fr" ? fr : undefined,
                        });
                      })()}
                    </TableCell>
                    <TableCell>{entry.clients?.name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.hours}h</TableCell>
                    <TableCell className="text-right">${entry.hourly_rate}/h</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(entry.hours * entry.hourly_rate).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={entry.is_billed ? "billed" : "unbilled"}
                        onValueChange={async (value) => {
                          if (value === "billed" && !entry.is_billed) {
                            await updateTimeEntry(entry.id, { is_billed: true });
                          } else if (value === "unbilled" && entry.is_billed) {
                            await markAsUnbilled(entry.id);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="unbilled">
                            {language === "fr" ? "Non facturé" : "Unbilled"}
                          </SelectItem>
                          <SelectItem value="billed">
                            {language === "fr" ? "Facturé" : "Billed"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {!entry.is_billed && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTimeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry 
                ? (language === "fr" ? "Modifier les heures" : "Edit Hours")
                : (language === "fr" ? "Ajouter des heures" : "Add Hours")
              }
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Client" : "Client"}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleClientChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === "fr" ? "Sélectionner" : "Select"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Entreprise (optionnel)" : "Company (optional)"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === "fr" ? "Sélectionner" : "Select"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === "fr" ? "Service ou description" : "Service or description"}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleServiceChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === "fr" ? "Choisir un service ou écrire" : "Choose service or write"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="custom">
                          {language === "fr" ? "✏️ Description personnalisée" : "✏️ Custom description"}
                        </SelectItem>
                        {services.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {language === "fr" ? "Services disponibles" : "Available services"}
                            </div>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {useCustomDescription && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Description" : "Description"}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={language === "fr" ? "Développement frontend" : "Frontend development"} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Date" : "Date"}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Heures" : "Hours"}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" {...field} placeholder="8" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "fr" ? "Taux horaire ($)" : "Hourly Rate ($)"}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} placeholder="75" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === "fr" ? "Notes (optionnel)" : "Notes (optional)"}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setUseCustomDescription(false);
                    form.reset();
                  }}
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Button>
                <Button type="submit">
                  {language === "fr" ? "Enregistrer" : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
