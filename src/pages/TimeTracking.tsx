import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, FileText, Trash2 } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
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
  const { timeEntries, loading, createTimeEntry, deleteTimeEntry, getUnbilledEntries, markAsBilled } = useTimeEntries();
  const { clients } = useClients();
  const { companies } = useCompanies();
  const { products } = useProducts();
  const { createInvoice } = useInvoices();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [useCustomDescription, setUseCustomDescription] = useState(false);

  useSEO({
    title: language === "fr" ? "Suivi des heures" : "Time Tracking",
    description: language === "fr" 
      ? "Suivez vos heures de travail et créez des factures"
      : "Track your working hours and create invoices",
  });

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

  const services = products.filter(p => p.unit === "hour" || p.unit === "day");

  const onSubmit = async (data: TimeEntryFormData) => {
    await createTimeEntry({
      client_id: data.client_id,
      company_id: data.company_id || null,
      description: data.description,
      hours: parseFloat(data.hours),
      hourly_rate: parseFloat(data.hourly_rate),
      date: data.date,
      notes: data.notes || null,
    });
    setIsDialogOpen(false);
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
      
      const items = entries.map((entry) => ({
        description: entry.description,
        quantity: entry.hours,
        unit_price: entry.hourly_rate,
        total: entry.hours * entry.hourly_rate,
        notes: entry.notes || null,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      const invoice = await createInvoice(
        {
          client_id: clientId,
          invoice_number: "TEMP",
          subtotal,
          total: subtotal,
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
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
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
          <Button onClick={() => setIsDialogOpen(true)}>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr" ? "Chargement..." : "Loading..."}
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr"
                ? "Aucune heure enregistrée"
                : "No hours recorded"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
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
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {!entry.is_billed && (
                        <Checkbox
                          checked={selectedEntries.includes(entry.id)}
                          onCheckedChange={() => toggleSelection(entry.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.date), "d MMM yyyy", {
                        locale: language === "fr" ? fr : undefined,
                      })}
                    </TableCell>
                    <TableCell>{entry.clients?.name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.hours}h</TableCell>
                    <TableCell className="text-right">${entry.hourly_rate}/h</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(entry.hours * entry.hourly_rate).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {entry.is_billed ? (
                        <Badge variant="secondary">
                          {language === "fr" ? "Facturé" : "Billed"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {language === "fr" ? "Non facturé" : "Unbilled"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!entry.is_billed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTimeEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Ajouter des heures" : "Add Hours"}
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
