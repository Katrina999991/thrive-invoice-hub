import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, FileText, Trash2, Pencil, Filter, X, Play, Square, Pause } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const timeEntrySchema = z.object({
  client_id: z.string().min(1, "Le client est requis"),
  company_id: z.string().optional(),
  service_id: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  hours: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  hourly_rate: z.string().min(1, "Le taux horaire est requis"),
  date: z.string().min(1, "La date est requise"),
  notes: z.string().optional(),
}).refine((data) => {
  // Si on a start_time et end_time, c'est valide
  if (data.start_time && data.end_time) {
    return true;
  }
  // Sinon, on doit avoir hours
  return data.hours && data.hours.length > 0;
}, {
  message: "Veuillez renseigner soit les heures, soit l'heure de début et de fin",
  path: ["hours"],
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

type TimeRange = {
  id: string;
  start_time: string;
  end_time: string;
};

type ActiveTimer = {
  clientId: string;
  startTime: string;
  startTimestamp: number; // Precise timestamp for elapsed calculation
  date: string;
  serviceId?: string;
  description?: string;
  isPaused?: boolean;
  pausedAt?: string | null;
  totalPausedMs?: number;
};

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
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    { id: crypto.randomUUID(), start_time: "", end_time: "" }
  ]);
  const [baseHours, setBaseHours] = useState<number>(0);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [isStartTimerDialogOpen, setIsStartTimerDialogOpen] = useState(false);
  const [timerClientId, setTimerClientId] = useState<string>("");
  const [timerServiceId, setTimerServiceId] = useState<string>("");

  useSEO({
    title: language === "fr" ? "Suivi des heures" : "Time Tracking",
    description: language === "fr" 
      ? "Suivez vos heures de travail et créez des factures"
      : "Track your working hours and create invoices",
  });

  const services = products.filter(p => p.is_active && p.quantity === null);

  // Load active timer from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem("activeTimeTracker");
    if (savedTimer) {
      try {
        const timer = JSON.parse(savedTimer) as ActiveTimer;
        // Backwards compatibility: if no startTimestamp, calculate from date/time
        if (!timer.startTimestamp) {
          const [hours, minutes] = timer.startTime.split(':').map(Number);
          const [year, month, day] = timer.date.split('-').map(Number);
          timer.startTimestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
        }
        setActiveTimer(timer);
      } catch (e) {
        localStorage.removeItem("activeTimeTracker");
      }
    }
  }, []);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      let diffMs = now.getTime() - activeTimer.startTimestamp;
      
      // Subtract total paused time
      if (activeTimer.totalPausedMs) {
        diffMs -= activeTimer.totalPausedMs;
      }
      
      // If currently paused, subtract time since pause started
      if (activeTimer.isPaused && activeTimer.pausedAt) {
        const pausedAtTime = new Date(activeTimer.pausedAt).getTime();
        diffMs -= (now.getTime() - pausedAtTime);
      }
      
      if (diffMs < 0) {
        setElapsedTime("00:00:00");
        return;
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Start timer function
  const handleStartTimer = () => {
    if (!timerClientId) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" ? "Veuillez sélectionner un client" : "Please select a client",
        variant: "destructive"
      });
      return;
    }

    const now = new Date();
    const currentTime = format(now, "HH:mm");
    const currentDate = format(now, "yyyy-MM-dd");
    
    const actualServiceId = timerServiceId && timerServiceId !== "_none" ? timerServiceId : undefined;
    const service = actualServiceId ? services.find(s => s.id === actualServiceId) : undefined;
    
    const timer: ActiveTimer = {
      clientId: timerClientId,
      startTime: currentTime,
      startTimestamp: now.getTime(),
      date: currentDate,
      serviceId: actualServiceId,
      description: service?.name || undefined,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
    };
    
    localStorage.setItem("activeTimeTracker", JSON.stringify(timer));
    localStorage.setItem("lastTimeEntryClientId", timerClientId);
    setElapsedTime("00:00:00");
    setActiveTimer(timer);
    setIsStartTimerDialogOpen(false);
    setTimerClientId("");
    setTimerServiceId("");
    
    toast({
      title: language === "fr" ? "Timer démarré" : "Timer started",
      description: language === "fr" 
        ? `Début à ${currentTime}` 
        : `Started at ${currentTime}`,
    });
  };

  // Stop timer and open form to complete entry
  const handleStopTimer = () => {
    if (!activeTimer) return;
    
    const now = new Date();
    const endTime = format(now, "HH:mm");
    
    // Calculate hours
    const [startH, startM] = activeTimer.startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const totalHours = ((endMinutes - startMinutes) / 60).toFixed(2);
    
    // Get client's hourly rate
    const client = clients.find(c => c.id === activeTimer.clientId);
    const service = services.find(s => s.id === activeTimer.serviceId);
    
    // Reset form and populate with timer data
    form.reset({
      client_id: activeTimer.clientId,
      company_id: "",
      service_id: activeTimer.serviceId || "",
      description: activeTimer.description || "",
      hours: totalHours,
      hourly_rate: service?.price?.toString() || client?.hourly_rate?.toString() || "",
      date: activeTimer.date,
      notes: "",
    });
    
    // Set up time range
    setUseTimeRange(true);
    setTimeRanges([{
      id: crypto.randomUUID(),
      start_time: activeTimer.startTime,
      end_time: endTime
    }]);
    
    if (activeTimer.serviceId && activeTimer.serviceId !== "custom") {
      setUseCustomDescription(false);
    } else if (activeTimer.description) {
      setUseCustomDescription(true);
    }
    
    // Clear the timer
    localStorage.removeItem("activeTimeTracker");
    setActiveTimer(null);
    
    // Open the dialog
    setIsDialogOpen(true);
  };

  // Cancel timer without saving
  const handleCancelTimer = () => {
    localStorage.removeItem("activeTimeTracker");
    setActiveTimer(null);
    toast({
      title: language === "fr" ? "Timer annulé" : "Timer cancelled",
    });
  };

  // Pause timer
  const handlePauseTimer = () => {
    if (!activeTimer || activeTimer.isPaused) return;
    
    const updatedTimer: ActiveTimer = {
      ...activeTimer,
      isPaused: true,
      pausedAt: new Date().toISOString(),
    };
    
    localStorage.setItem("activeTimeTracker", JSON.stringify(updatedTimer));
    setActiveTimer(updatedTimer);
    
    toast({
      title: language === "fr" ? "Timer en pause" : "Timer paused",
    });
  };

  // Resume timer
  const handleResumeTimer = () => {
    if (!activeTimer || !activeTimer.isPaused || !activeTimer.pausedAt) return;
    
    const pausedAtTime = new Date(activeTimer.pausedAt).getTime();
    const now = new Date().getTime();
    const pauseDuration = now - pausedAtTime;
    
    const updatedTimer: ActiveTimer = {
      ...activeTimer,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: (activeTimer.totalPausedMs || 0) + pauseDuration,
    };
    
    localStorage.setItem("activeTimeTracker", JSON.stringify(updatedTimer));
    setActiveTimer(updatedTimer);
    
    toast({
      title: language === "fr" ? "Timer repris" : "Timer resumed",
    });
  };

  // Open start timer dialog
  const handleOpenStartTimerDialog = () => {
    const lastClientId = localStorage.getItem("lastTimeEntryClientId");
    if (lastClientId && clients.find(c => c.id === lastClientId)) {
      setTimerClientId(lastClientId);
    }
    if (services.length > 0) {
      setTimerServiceId(services[0].id);
    }
    setIsStartTimerDialogOpen(true);
  };

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      start_time: "",
      end_time: "",
      hourly_rate: "",
      description: "",
      service_id: "",
      notes: "",
    },
  });

  // Calculer les heures à partir de plusieurs plages horaires
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    
    for (const range of timeRanges) {
      if (!range.start_time || !range.end_time) continue;
      
      const [startHour, startMinute] = range.start_time.split(':').map(Number);
      const [endHour, endMinute] = range.end_time.split(':').map(Number);
      
      const startInMinutes = startHour * 60 + startMinute;
      let endInMinutes = endHour * 60 + endMinute;
      
      // Si l'heure de fin est avant l'heure de début, on suppose que c'est le lendemain
      if (endInMinutes < startInMinutes) {
        endInMinutes += 24 * 60;
      }
      
      totalMinutes += endInMinutes - startInMinutes;
    }
    
    // Ajouter les heures de base (heures déjà enregistrées)
    const totalHours = (totalMinutes / 60) + baseHours;
    return totalHours.toFixed(2);
  };

  // Mettre à jour les heures calculées
  useEffect(() => {
    if (useTimeRange) {
      const total = calculateTotalHours();
      form.setValue("hours", total);
    }
  }, [timeRanges, useTimeRange]);

  const addTimeRange = () => {
    setTimeRanges([...timeRanges, { id: crypto.randomUUID(), start_time: "", end_time: "" }]);
  };

  const removeTimeRange = (id: string) => {
    // Garder au moins une plage horaire
    if (timeRanges.length > 1) {
      setTimeRanges(timeRanges.filter(range => range.id !== id));
    }
  };

  const updateTimeRange = (id: string, field: 'start_time' | 'end_time', value: string) => {
    setTimeRanges(timeRanges.map(range => 
      range.id === id ? { ...range, [field]: value } : range
    ));
  };

  // Fonction pour ouvrir le dialog et pré-remplir avec le dernier client et premier service
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setTimeout(() => {
      // Pré-sélectionner le dernier client utilisé
      const lastClientId = localStorage.getItem("lastTimeEntryClientId");
      if (lastClientId && clients.find(c => c.id === lastClientId)) {
        form.setValue("client_id", lastClientId);
        handleClientChange(lastClientId);
      }
      
      // Pré-sélectionner le premier service
      if (services.length > 0) {
        form.setValue("service_id", services[0].id);
        form.setValue("description", services[0].name);
        if (services[0].price) {
          form.setValue("hourly_rate", services[0].price.toString());
        }
      }
    }, 0);
  };

  const onSubmit = async (data: TimeEntryFormData) => {
    // Les heures sont déjà calculées dans le champ hours
    const hours = data.hours;
    
    // Préparer les plages horaires si en mode time range
    const ranges = useTimeRange 
      ? timeRanges.filter(r => r.start_time && r.end_time)
      : undefined;
    
    if (editingEntry) {
      await updateTimeEntry(
        editingEntry,
        {
          client_id: data.client_id,
          company_id: data.company_id || null,
          description: data.description,
          hours: parseFloat(hours || "0"),
          hourly_rate: parseFloat(data.hourly_rate),
          date: data.date,
          notes: data.notes || null,
        },
        ranges
      );
    } else {
      await createTimeEntry(
        {
          client_id: data.client_id,
          company_id: data.company_id || null,
          description: data.description,
          hours: parseFloat(hours || "0"),
          hourly_rate: parseFloat(data.hourly_rate),
          date: data.date,
          notes: data.notes || null,
        },
        ranges
      );
    }
    
    // Sauvegarder le dernier client utilisé
    localStorage.setItem("lastTimeEntryClientId", data.client_id);
    
    setIsDialogOpen(false);
    setEditingEntry(null);
    setUseCustomDescription(false);
    setUseTimeRange(false);
    setBaseHours(0);
    setTimeRanges([{ id: crypto.randomUUID(), start_time: "", end_time: "" }]);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      start_time: "",
      end_time: "",
      hourly_rate: "",
      description: "",
      service_id: "",
      notes: "",
    });
  };

  const handleEdit = (entry: typeof timeEntries[0]) => {
    setEditingEntry(entry.id);
    
    // Si l'entrée a des plages horaires, les charger
    if (entry.time_entry_ranges && entry.time_entry_ranges.length > 0) {
      setUseTimeRange(true);
      setTimeRanges(entry.time_entry_ranges.map(r => ({
        id: r.id,
        start_time: r.start_time,
        end_time: r.end_time
      })));
      setBaseHours(0);
    } else {
      // Sinon, utiliser les heures totales
      setBaseHours(entry.hours);
      setTimeRanges([{ id: crypto.randomUUID(), start_time: "", end_time: "" }]);
    }
    
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
    setUseTimeRange(false);
    setBaseHours(0);
    setTimeRanges([{ id: crypto.randomUUID(), start_time: "", end_time: "" }]);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      hours: "",
      start_time: "",
      end_time: "",
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
      
      // Group entries by date
      const entriesByDate = entries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      }, {} as Record<string, typeof entries>);
      
      // Create invoice items, combining entries with the same date
      const items = Object.entries(entriesByDate)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, dateEntries]) => {
          // Parse date without timezone issues
          const [year, month, day] = date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day);
          
          // Sum hours for this date
          const totalHours = dateEntries.reduce((sum, e) => sum + e.hours, 0);
          
          // Use weighted average for hourly rate if different rates
          const totalAmount = dateEntries.reduce((sum, e) => sum + (e.hours * e.hourly_rate), 0);
          const avgHourlyRate = totalHours > 0 ? totalAmount / totalHours : dateEntries[0].hourly_rate;
          
          // Combine descriptions if different
          const uniqueDescriptions = [...new Set(dateEntries.map(e => e.description))];
          const description = uniqueDescriptions.length === 1
            ? `${uniqueDescriptions[0]} - ${format(localDate, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })}`
            : `${uniqueDescriptions.join(", ")} - ${format(localDate, "d MMM yyyy", { locale: language === "fr" ? fr : undefined })}`;
          
          // Combine notes
          const allNotes = dateEntries.map(e => e.notes).filter(Boolean);
          const combinedNotes = allNotes.length > 0 ? allNotes.join(" | ") : null;
          
          return {
            description,
            quantity: totalHours,
            unit_price: avgHourlyRate,
            total: totalAmount,
            notes: combinedNotes,
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
    <div className="container mx-auto py-4 sm:py-8 space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {language === "fr" ? "Suivi des heures" : "Time Tracking"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {language === "fr"
              ? "Enregistrez vos heures et créez des factures"
              : "Track your hours and create invoices"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {selectedEntries.length > 0 && (
            <Button onClick={() => setShowInvoiceConfirm(true)} disabled={isCreatingInvoice} className="flex-1 sm:flex-none">
              <FileText className="mr-2 h-4 w-4" />
              {language === "fr" ? "Facture" : "Invoice"} ({selectedEntries.length})
            </Button>
          )}
          {!activeTimer && (
            <Button variant="outline" onClick={handleOpenStartTimerDialog} className="flex-1 sm:flex-none">
              <Play className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{language === "fr" ? "Démarrer le pointage" : "Start Timer"}</span>
              <span className="sm:hidden">{language === "fr" ? "Pointage" : "Timer"}</span>
            </Button>
          )}
          <Button onClick={handleOpenDialog} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{language === "fr" ? "Ajouter des heures" : "Add Hours"}</span>
            <span className="sm:hidden">{language === "fr" ? "Ajouter" : "Add"}</span>
          </Button>
        </div>
      </div>

      {/* Active Timer Card */}
      {activeTimer && (
        <Card className={cn("border-primary", activeTimer.isPaused ? "bg-muted/50" : "bg-primary/5")}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    activeTimer.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                  )} />
                  <span className="font-medium text-primary">
                    {activeTimer.isPaused 
                      ? (language === "fr" ? "En pause" : "Paused")
                      : (language === "fr" ? "En cours" : "In progress")
                    }
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold">{elapsedTime}</div>
                <div className="text-muted-foreground">
                  {clients.find(c => c.id === activeTimer.clientId)?.name || "-"}
                  {activeTimer.description && ` • ${activeTimer.description}`}
                </div>
                <Badge variant="outline">
                  {language === "fr" ? "Début" : "Started"}: {activeTimer.startTime}
                </Badge>
              </div>
              <div className="flex gap-2">
                {activeTimer.isPaused ? (
                  <Button onClick={handleResumeTimer} variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    {language === "fr" ? "Reprendre" : "Resume"}
                  </Button>
                ) : (
                  <Button onClick={handlePauseTimer} variant="outline">
                    <Pause className="mr-2 h-4 w-4" />
                    {language === "fr" ? "Pause" : "Pause"}
                  </Button>
                )}
                <Button onClick={handleStopTimer} variant="default">
                  <Square className="mr-2 h-4 w-4" />
                  {language === "fr" ? "Terminer" : "Stop"}
                </Button>
                <Button onClick={handleCancelTimer} variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {language === "fr" ? "Heures enregistrées" : "Recorded Hours"}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
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
                    "w-full sm:w-[280px] justify-start text-left font-normal",
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
                    if (range?.from && range?.to) {
                      setIsDatePickerOpen(false);
                    }
                  }}
                  numberOfMonths={1}
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
                className="w-full sm:w-auto"
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

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="time-range-mode"
                  checked={useTimeRange}
                  onCheckedChange={(checked) => {
                    setUseTimeRange(checked);
                    if (checked) {
                      // Si on a déjà des heures (mode édition), les garder comme base
                      const currentHours = parseFloat(form.getValues("hours") || "0");
                      if (currentHours > 0 && editingEntry) {
                        setBaseHours(currentHours);
                      }
                      setTimeRanges([{ id: crypto.randomUUID(), start_time: "", end_time: "" }]);
                    } else {
                      setBaseHours(0);
                      form.setValue("start_time", "");
                      form.setValue("end_time", "");
                    }
                  }}
                />
                <Label htmlFor="time-range-mode" className="cursor-pointer">
                  {language === "fr" 
                    ? "Calculer les heures automatiquement (heure de début/fin)" 
                    : "Calculate hours automatically (start/end time)"}
                </Label>
              </div>

              {!useTimeRange ? (
                <div className="grid grid-cols-2 gap-4">
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
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>{language === "fr" ? "Plages horaires" : "Time Ranges"}</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeRange}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {language === "fr" ? "Ajouter" : "Add"}
                    </Button>
                  </div>
                  
                  {timeRanges.map((range, index) => (
                    <div key={range.id} className="flex gap-2 items-end">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          {index === 0 && (
                            <Label className="text-sm mb-1">
                              {language === "fr" ? "Début" : "Start"}
                            </Label>
                          )}
                          <Input
                            type="time"
                            value={range.start_time}
                            onChange={(e) => updateTimeRange(range.id, 'start_time', e.target.value)}
                          />
                        </div>
                        <div>
                          {index === 0 && (
                            <Label className="text-sm mb-1">
                              {language === "fr" ? "Fin" : "End"}
                            </Label>
                          )}
                          <Input
                            type="time"
                            value={range.end_time}
                            onChange={(e) => updateTimeRange(range.id, 'end_time', e.target.value)}
                          />
                        </div>
                      </div>
                      {timeRanges.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTimeRange(range.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm">
                      {baseHours > 0 && (
                        <div className="text-muted-foreground mb-1">
                          {language === "fr" ? "Heures existantes: " : "Existing hours: "}
                          <span className="font-medium text-foreground">{baseHours.toFixed(2)}h</span>
                        </div>
                      )}
                      <div className={baseHours > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        {language === "fr" ? "Total des heures: " : "Total hours: "}
                        <span className="font-medium text-foreground">{calculateTotalHours()}h</span>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="hourly_rate"
                      render={({ field }) => (
                        <FormItem className="flex-none w-32">
                          <FormLabel className="text-xs">{language === "fr" ? "Taux ($)" : "Rate ($)"}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} placeholder="75" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

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
                  onClick={handleCloseDialog}
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

      <AlertDialog open={showInvoiceConfirm} onOpenChange={setShowInvoiceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Créer une facture' : 'Create Invoice'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? `Voulez-vous créer une facture avec ${selectedEntries.length} entrée(s) sélectionnée(s) ?`
                : `Do you want to create an invoice with ${selectedEntries.length} selected entry(ies)?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowInvoiceConfirm(false);
              handleCreateInvoice();
            }}>
              {language === 'fr' ? 'Confirmer' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Timer Dialog */}
      <Dialog open={isStartTimerDialogOpen} onOpenChange={setIsStartTimerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Démarrer le pointage" : "Start Timer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "fr" ? "Client" : "Client"}</Label>
              <Select value={timerClientId} onValueChange={setTimerClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Sélectionner un client" : "Select client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === "fr" ? "Service (optionnel)" : "Service (optional)"}</Label>
              <Select value={timerServiceId} onValueChange={setTimerServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "fr" ? "Sélectionner un service" : "Select service"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">
                    {language === "fr" ? "Aucun" : "None"}
                  </SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsStartTimerDialogOpen(false)}>
                {language === "fr" ? "Annuler" : "Cancel"}
              </Button>
              <Button onClick={handleStartTimer}>
                <Play className="mr-2 h-4 w-4" />
                {language === "fr" ? "Démarrer" : "Start"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
