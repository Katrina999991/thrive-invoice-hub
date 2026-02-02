import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, FileText, Trash2, Pencil, Filter, X, Play, Square, Pause, Lock, AlertCircle, Check, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, Archive, ArchiveRestore } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { useTimeTrackingPermissions } from "@/hooks/useTimeTrackingPermissions";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { roundDuration, hoursToMinutes, minutesToHours, type RoundingMethod, type RoundingIncrement } from "@/lib/timeRounding";

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
  const { user } = useAuth();
  
  // Get permissions from selected company
  const { hasPermission, selectedCompanyId } = useSelectedCompany();
  const permissions = useTimeTrackingPermissions(hasPermission);
  
  // Fetch entries based on permissions - employees only see their own
  const shouldFilterOwnOnly = !permissions.canViewAll;
  const { timeEntries, loading, createTimeEntry, updateTimeEntry, deleteTimeEntry, getUnbilledEntries, markAsBilled, markAsUnbilled, approveTimeEntry, unapproveTimeEntry, archiveTimeEntry, unarchiveTimeEntry } = useTimeEntries({ filterOwnOnly: shouldFilterOwnOnly });
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
  const [filterCreators, setFilterCreators] = useState<string[]>([]);
  const [filterApproval, setFilterApproval] = useState<string>("all"); // "all" | "pending" | "approved"
  const [filterBillingStatus, setFilterBillingStatus] = useState<string>("all"); // "all" | "unbilled" | "billed"
  const [showArchived, setShowArchived] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCreatorFilterOpen, setIsCreatorFilterOpen] = useState(false);
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">("desc");
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
  
  // Timer entry data for rounding - stored when timer is stopped
  const [timerEntryData, setTimerEntryData] = useState<{
    isFromTimer: boolean;
    durationRawMinutes: number;
    durationBilledMinutes: number;
  } | null>(null);

  // User-specific localStorage keys
  const timerStorageKey = useMemo(() => 
    user?.id ? `activeTimeTracker_${user.id}` : null, 
    [user?.id]
  );
  const lastClientStorageKey = useMemo(() => 
    user?.id ? `lastTimeEntryClientId_${user.id}` : null, 
    [user?.id]
  );

  useSEO({
    title: language === "fr" ? "Suivi des heures" : "Time Tracking",
    description: language === "fr" 
      ? "Suivez vos heures de travail et créez des factures"
      : "Track your working hours and create invoices",
  });

  const services = products.filter(p => p.is_active && p.quantity === null);

  // Load active timer from localStorage on mount (user-specific)
  useEffect(() => {
    if (!timerStorageKey) return;
    
    const savedTimer = localStorage.getItem(timerStorageKey);
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
        localStorage.removeItem(timerStorageKey);
      }
    } else {
      // Clear timer if switching users
      setActiveTimer(null);
    }
  }, [timerStorageKey]);

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
    if (!timerClientId || !timerStorageKey || !lastClientStorageKey) {
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
    
    localStorage.setItem(timerStorageKey, JSON.stringify(timer));
    localStorage.setItem(lastClientStorageKey, timerClientId);
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
    
    // Calculate raw duration in minutes (accounting for pause time)
    let rawDurationMs = now.getTime() - activeTimer.startTimestamp;
    
    // Subtract total paused time
    if (activeTimer.totalPausedMs) {
      rawDurationMs -= activeTimer.totalPausedMs;
    }
    
    const rawMinutes = Math.max(0, Math.round(rawDurationMs / (1000 * 60)));
    
    // Get client to check for rounding settings
    const client = clients.find(c => c.id === activeTimer.clientId);
    const service = services.find(s => s.id === activeTimer.serviceId);
    
    // Calculate billed minutes with rounding if enabled
    let billedMinutes = rawMinutes;
    if (client?.time_rounding_enabled && client.time_rounding_increment_minutes && client.time_rounding_method) {
      billedMinutes = roundDuration(
        rawMinutes,
        client.time_rounding_increment_minutes as RoundingIncrement,
        client.time_rounding_method as RoundingMethod
      );
    }
    
    // Convert billed minutes to hours for the form
    const billedHours = minutesToHours(billedMinutes);
    
    // Store timer data for submission
    setTimerEntryData({
      isFromTimer: true,
      durationRawMinutes: rawMinutes,
      durationBilledMinutes: billedMinutes
    });
    
    // Reset form and populate with timer data
    form.reset({
      client_id: activeTimer.clientId,
      company_id: "",
      service_id: activeTimer.serviceId || "",
      description: activeTimer.description || "",
      hours: billedHours.toFixed(2),
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
    if (timerStorageKey) {
      localStorage.removeItem(timerStorageKey);
    }
    setActiveTimer(null);
    
    // Open the dialog
    setIsDialogOpen(true);
  };

  // Cancel timer without saving
  const handleCancelTimer = () => {
    if (timerStorageKey) {
      localStorage.removeItem(timerStorageKey);
    }
    setActiveTimer(null);
    toast({
      title: language === "fr" ? "Timer annulé" : "Timer cancelled",
    });
  };

  // Pause timer
  const handlePauseTimer = () => {
    if (!activeTimer || activeTimer.isPaused || !timerStorageKey) return;
    
    const updatedTimer: ActiveTimer = {
      ...activeTimer,
      isPaused: true,
      pausedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(timerStorageKey, JSON.stringify(updatedTimer));
    setActiveTimer(updatedTimer);
    
    toast({
      title: language === "fr" ? "Timer en pause" : "Timer paused",
    });
  };

  // Resume timer
  const handleResumeTimer = () => {
    if (!activeTimer || !activeTimer.isPaused || !activeTimer.pausedAt || !timerStorageKey) return;
    
    const pausedAtTime = new Date(activeTimer.pausedAt).getTime();
    const now = new Date().getTime();
    const pauseDuration = now - pausedAtTime;
    
    const updatedTimer: ActiveTimer = {
      ...activeTimer,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: (activeTimer.totalPausedMs || 0) + pauseDuration,
    };
    
    localStorage.setItem(timerStorageKey, JSON.stringify(updatedTimer));
    setActiveTimer(updatedTimer);
    
    toast({
      title: language === "fr" ? "Timer repris" : "Timer resumed",
    });
  };

  // Open start timer dialog
  const handleOpenStartTimerDialog = () => {
    if (lastClientStorageKey) {
      const lastClientId = localStorage.getItem(lastClientStorageKey);
      if (lastClientId && clients.find(c => c.id === lastClientId)) {
        setTimerClientId(lastClientId);
      }
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

  // Reset selection when billing status filter changes
  useEffect(() => {
    setSelectedEntries([]);
  }, [filterBillingStatus]);

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
      if (lastClientStorageKey) {
        const lastClientId = localStorage.getItem(lastClientStorageKey);
        if (lastClientId && clients.find(c => c.id === lastClientId)) {
          form.setValue("client_id", lastClientId);
          handleClientChange(lastClientId);
        }
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
      // Build the entry data with timer-specific fields if applicable
      const entryData: any = {
        client_id: data.client_id,
        company_id: data.company_id || null,
        description: data.description,
        hours: parseFloat(hours || "0"),
        hourly_rate: parseFloat(data.hourly_rate),
        date: data.date,
        notes: data.notes || null,
      };
      
      // Add timer-specific data if this is from a timer
      if (timerEntryData?.isFromTimer) {
        entryData.source = 'timer';
        entryData.duration_raw_minutes = timerEntryData.durationRawMinutes;
        entryData.duration_billed_minutes = timerEntryData.durationBilledMinutes;
      } else {
        entryData.source = 'manual';
      }
      
      await createTimeEntry(entryData, ranges);
    }
    
    // Sauvegarder le dernier client utilisé
    if (lastClientStorageKey) {
      localStorage.setItem(lastClientStorageKey, data.client_id);
    }
    
    setIsDialogOpen(false);
    setEditingEntry(null);
    setUseCustomDescription(false);
    setUseTimeRange(false);
    setBaseHours(0);
    setTimerEntryData(null);
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
    setTimerEntryData(null);
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

  // Get unique creators from all entries for the filter
  const uniqueCreators = useMemo(() => {
    const creators = new Map<string, { userId: string; name: string }>();
    timeEntries.forEach(entry => {
      if (!creators.has(entry.user_id)) {
        creators.set(entry.user_id, {
          userId: entry.user_id,
          name: entry.profiles?.username || entry.profiles?.display_name || (entry.user_id === user?.id ? (language === "fr" ? "Moi" : "Me") : (language === "fr" ? "Inconnu" : "Unknown"))
        });
      }
    });
    return Array.from(creators.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timeEntries, user?.id, language]);

  // Filtrer les entrées
  const filteredEntries = timeEntries.filter((entry) => {
    // Filtre par client
    if (filterClient !== "all" && entry.client_id !== filterClient) {
      return false;
    }

    // Filtre par créateur
    if (filterCreators.length > 0 && !filterCreators.includes(entry.user_id)) {
      return false;
    }

    // Filtre par approbation
    if (filterApproval === "approved" && !(entry as any).approved_at) {
      return false;
    }
    // Pending = not approved AND not own entries (own entries don't need approval)
    if (filterApproval === "pending" && ((entry as any).approved_at || entry.user_id === user?.id)) {
      return false;
    }

    // Filtre par statut de facturation
    if (filterBillingStatus === "billed" && !entry.is_billed) {
      return false;
    }
    if (filterBillingStatus === "unbilled" && entry.is_billed) {
      return false;
    }
    
    // Filtre par archive
    const isArchived = (entry as any).is_archived || false;
    if (!showArchived && isArchived) {
      return false;
    }
    if (showArchived && !isArchived) {
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

  // Trier les entrées par date
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateSortOrder === "asc") {
        return dateCompare !== 0 ? dateCompare : a.created_at.localeCompare(b.created_at);
      } else {
        return dateCompare !== 0 ? -dateCompare : -a.created_at.localeCompare(b.created_at);
      }
    });
  }, [filteredEntries, dateSortOrder]);

  // Obtenir les entrées non facturées filtrées
  const unbilledFilteredEntries = filteredEntries.filter(entry => !entry.is_billed);

  // Obtenir les entrées facturées filtrées (pour archivage en lot)
  const billedFilteredEntries = filteredEntries.filter(entry => entry.is_billed && !(entry as any).is_archived);

  // Mode de sélection : "invoice" (unbilled) ou "archive" (billed)
  const selectionMode = filterBillingStatus === "billed" ? "archive" : "invoice";
  const selectableEntries = selectionMode === "archive" ? billedFilteredEntries : unbilledFilteredEntries;

  // Vérifier si toutes les entrées sélectionnables sont sélectionnées
  const allSameClientSelected = selectionMode === "invoice" && selectedClientId 
    ? unbilledFilteredEntries.filter(e => e.client_id === selectedClientId).every(e => selectedEntries.includes(e.id))
    : selectableEntries.every(e => selectedEntries.includes(e.id));
  
  const someSelected = selectedEntries.length > 0 && !allSameClientSelected;

  const handleSelectAll = () => {
    if (selectableEntries.length === 0) return;
    
    if (allSameClientSelected && selectedEntries.length > 0) {
      // Tout désélectionner
      setSelectedEntries([]);
    } else if (selectionMode === "archive") {
      // Sélectionner toutes les entrées facturées
      setSelectedEntries(selectableEntries.map(e => e.id));
    } else {
      // Sélectionner toutes les entrées non facturées du premier client ou toutes si aucune sélection
      const firstClientId = selectedClientId || unbilledFilteredEntries[0]?.client_id;
      const entriesToSelect = unbilledFilteredEntries
        .filter(e => !firstClientId || e.client_id === firstClientId)
        .map(e => e.id);
      setSelectedEntries(entriesToSelect);
    }
  };

  // Archiver les entrées sélectionnées
  const handleBulkArchive = async () => {
    if (selectedEntries.length === 0) return;
    
    try {
      for (const entryId of selectedEntries) {
        await archiveTimeEntry(entryId);
      }
      setSelectedEntries([]);
    } catch (error) {
      console.error("Error bulk archiving:", error);
    }
  };

  // Permission denied message component
  const PermissionDeniedTooltip = ({ children, message }: { children: React.ReactNode; message: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed">{children}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {message}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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
          {/* Invoice button - only show if user can link to invoices and in invoice mode */}
          {selectedEntries.length > 0 && permissions.canLinkToInvoice && selectionMode === "invoice" && (
            <Button onClick={() => setShowInvoiceConfirm(true)} disabled={isCreatingInvoice} className="flex-1 sm:flex-none">
              <FileText className="mr-2 h-4 w-4" />
              {language === "fr" ? "Facture" : "Invoice"} ({selectedEntries.length})
            </Button>
          )}
          {/* Archive button - only show when in archive mode with selected entries */}
          {selectedEntries.length > 0 && permissions.canMarkAsBilled && selectionMode === "archive" && (
            <Button onClick={handleBulkArchive} className="flex-1 sm:flex-none">
              <Archive className="mr-2 h-4 w-4" />
              {language === "fr" ? "Archiver" : "Archive"} ({selectedEntries.length})
            </Button>
          )}
          {/* Timer button - only show if user can create entries */}
          {!activeTimer && permissions.canCreate && (
            <Button variant="outline" onClick={handleOpenStartTimerDialog} className="flex-1 sm:flex-none">
              <Play className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{language === "fr" ? "Démarrer la minuterie" : "Start Timer"}</span>
              <span className="sm:hidden">{language === "fr" ? "Minuterie" : "Timer"}</span>
            </Button>
          )}
          {/* Add button - only show if user can create entries */}
          {permissions.canCreate && (
            <Button onClick={handleOpenDialog} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{language === "fr" ? "Ajouter des heures" : "Add Hours"}</span>
              <span className="sm:hidden">{language === "fr" ? "Ajouter" : "Add"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Permission info banner for read-only users */}
      {!permissions.canCreate && !permissions.canEditOwn && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {language === "fr" 
              ? "Vous avez un accès en lecture seule aux entrées de temps."
              : "You have read-only access to time entries."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Info banner for employees who can only see their own entries */}
      {permissions.canViewOwn && !permissions.canViewAll && permissions.canCreate && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {language === "fr" 
              ? "Vous ne pouvez voir et gérer que vos propres entrées de temps."
              : "You can only view and manage your own time entries."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Active Timer Card */}
      {activeTimer && (
        <Card className={cn("border-primary", activeTimer.isPaused ? "bg-muted/50" : "bg-primary/5")}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-2">
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
                  <div className="text-2xl font-mono font-bold sm:ml-2">{elapsedTime}</div>
                </div>
                <div className="text-sm sm:text-base text-muted-foreground truncate">
                  {clients.find(c => c.id === activeTimer.clientId)?.name || "-"}
                  {activeTimer.description && ` • ${activeTimer.description}`}
                </div>
                <Badge variant="outline" className="w-fit">
                  {language === "fr" ? "Début" : "Started"}: {activeTimer.startTime}
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {activeTimer.isPaused ? (
                  <Button onClick={handleResumeTimer} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Play className="mr-2 h-4 w-4" />
                    {language === "fr" ? "Reprendre" : "Resume"}
                  </Button>
                ) : (
                  <Button onClick={handlePauseTimer} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Pause className="mr-2 h-4 w-4" />
                    {language === "fr" ? "Pause" : "Pause"}
                  </Button>
                )}
                <Button onClick={handleStopTimer} variant="default" size="sm" className="flex-1 sm:flex-none">
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
          <div className="flex flex-col sm:flex-row gap-4 mt-4 flex-wrap">
            <div className="flex-1 min-w-[150px]">
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
            
            {/* Creator filter - only show if user can view all */}
            {permissions.canViewAll && uniqueCreators.length > 1 && (
              <Popover open={isCreatorFilterOpen} onOpenChange={setIsCreatorFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[200px] justify-start text-left font-normal",
                      filterCreators.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {filterCreators.length > 0 ? (
                      <span className="truncate">
                        {filterCreators.length === 1
                          ? uniqueCreators.find(c => c.userId === filterCreators[0])?.name
                          : `${filterCreators.length} ${language === "fr" ? "sélectionnés" : "selected"}`}
                      </span>
                    ) : (
                      <span>{language === "fr" ? "Tous les utilisateurs" : "All users"}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">
                        {language === "fr" ? "Créé par" : "Created by"}
                      </span>
                      {filterCreators.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setFilterCreators([])}
                        >
                          {language === "fr" ? "Effacer" : "Clear"}
                        </Button>
                      )}
                    </div>
                    {uniqueCreators.map((creator) => (
                      <div key={creator.userId} className="flex items-center space-x-2">
                        <Checkbox
                          id={`creator-${creator.userId}`}
                          checked={filterCreators.includes(creator.userId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterCreators(prev => [...prev, creator.userId]);
                            } else {
                              setFilterCreators(prev => prev.filter(id => id !== creator.userId));
                            }
                          }}
                        />
                        <label
                          htmlFor={`creator-${creator.userId}`}
                          className="text-sm cursor-pointer flex-1 truncate"
                        >
                          {creator.name}
                          {creator.userId === user?.id && (
                            <span className="text-muted-foreground ml-1">({language === "fr" ? "moi" : "me"})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
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
            {/* Approval filter - only show if user can approve */}
            {permissions.canApprove && (
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "fr" ? "Tous" : "All"}</SelectItem>
                  <SelectItem value="pending">{language === "fr" ? "En attente" : "Pending"}</SelectItem>
                  <SelectItem value="approved">{language === "fr" ? "Approuvés" : "Approved"}</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Billing status filter */}
            <Select value={filterBillingStatus} onValueChange={setFilterBillingStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "fr" ? "Tous statuts" : "All statuses"}</SelectItem>
                <SelectItem value="unbilled">{language === "fr" ? "Non facturé" : "Unbilled"}</SelectItem>
                <SelectItem value="billed">{language === "fr" ? "Facturé" : "Billed"}</SelectItem>
              </SelectContent>
            </Select>
            {/* Archive toggle */}
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="w-full sm:w-auto"
            >
              <Archive className="mr-2 h-4 w-4" />
              {showArchived 
                ? (language === "fr" ? "Voir actifs" : "Show active")
                : (language === "fr" ? "Voir archivés" : "Show archived")
              }
            </Button>
            {(filterClient !== "all" || dateRange || filterCreators.length > 0 || filterApproval !== "all" || filterBillingStatus !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterClient("all");
                  setFilterCreators([]);
                  setDateRange(undefined);
                  setFilterApproval("all");
                  setFilterBillingStatus("all");
                }}
                className="w-full sm:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                {language === "fr" ? "Réinitialiser les filtres" : "Reset filters"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr" ? "Chargement..." : "Loading..."}
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "fr"
                ? "Aucune heure enregistrée"
                : "No hours recorded"}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Checkbox column - show for invoice or archive mode */}
                      {((permissions.canLinkToInvoice && selectionMode === "invoice") || 
                        (permissions.canMarkAsBilled && selectionMode === "archive")) && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSameClientSelected && selectedEntries.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label={language === "fr" ? "Tout sélectionner" : "Select all"}
                            disabled={selectableEntries.length === 0}
                            className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                            {...(someSelected && { "data-state": "indeterminate" })}
                          />
                        </TableHead>
                      )}
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 -ml-2 font-medium"
                          onClick={() => setDateSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                        >
                          {language === "fr" ? "Date" : "Date"}
                          {dateSortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-1 h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>{language === "fr" ? "Client" : "Client"}</TableHead>
                      <TableHead>{language === "fr" ? "Description" : "Description"}</TableHead>
                      {permissions.canViewAll && (
                        <TableHead>{language === "fr" ? "Créé par" : "Created by"}</TableHead>
                      )}
                      <TableHead className="text-right">{language === "fr" ? "Heures" : "Hours"}</TableHead>
                      <TableHead className="text-right">{language === "fr" ? "Taux" : "Rate"}</TableHead>
                      <TableHead className="text-right">{language === "fr" ? "Total" : "Total"}</TableHead>
                      <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                      {permissions.canViewAll && (
                        <TableHead>{language === "fr" ? "Approbation" : "Approval"}</TableHead>
                      )}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEntries.map((entry) => {
                      const canEdit = permissions.canEditEntry(entry.user_id, entry.is_billed);
                      const canDelete = permissions.canDeleteEntry(entry.user_id, entry.is_billed);
                      const isApproved = !!(entry as any).approved_at;
                      const canApproveEntry = permissions.canApprove && entry.user_id !== user?.id; // Can't approve own entries
                      
                      return (
                        <TableRow key={entry.id}>
                          {/* Checkbox cell - show for unbilled entries or billed entries in archive mode */}
                          {((permissions.canLinkToInvoice && selectionMode === "invoice") || 
                            (permissions.canMarkAsBilled && selectionMode === "archive")) && (
                            <TableCell>
                              {((selectionMode === "invoice" && !entry.is_billed) || 
                                (selectionMode === "archive" && entry.is_billed && !(entry as any).is_archived)) && (
                                <Checkbox
                                  checked={selectedEntries.includes(entry.id)}
                                  onCheckedChange={() => toggleSelection(entry.id)}
                                  disabled={selectionMode === "invoice" && selectedClientId !== null && entry.client_id !== selectedClientId}
                                />
                              )}
                            </TableCell>
                          )}
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
                          {permissions.canViewAll && (
                            <TableCell>
                              <span className={entry.user_id === user?.id ? "text-muted-foreground" : "font-medium"}>
                                {entry.profiles?.username || entry.profiles?.display_name || (language === "fr" ? "Inconnu" : "Unknown")}
                                {entry.user_id === user?.id && (
                                  <span className="text-xs ml-1">({language === "fr" ? "moi" : "me"})</span>
                                )}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            {(() => {
                              const rawMin = (entry as any).duration_raw_minutes;
                              const billedMin = (entry as any).duration_billed_minutes;
                              const isTimerEntry = (entry as any).source === 'timer';
                              const hasRounding = isTimerEntry && rawMin !== null && billedMin !== null && rawMin !== billedMin;
                              
                              if (hasRounding) {
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help">
                                          {entry.hours}h
                                          <span className="ml-1 text-xs text-primary">≈</span>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {language === "fr" ? "Temps réel" : "Actual"}: {minutesToHours(rawMin)}h
                                          <br />
                                          {language === "fr" ? "Facturable" : "Billable"}: {minutesToHours(billedMin)}h
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              }
                              return `${entry.hours}h`;
                            })()}
                          </TableCell>
                          <TableCell className="text-right">${entry.hourly_rate}/h</TableCell>
                          <TableCell className="text-right font-medium">
                            ${(entry.hours * entry.hourly_rate).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {/* Status dropdown - only editable if user can mark as billed */}
                            {permissions.canMarkAsBilled ? (
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
                            ) : (
                              <Badge variant={entry.is_billed ? "default" : "secondary"}>
                                {entry.is_billed 
                                  ? (language === "fr" ? "Facturé" : "Billed")
                                  : (language === "fr" ? "Non facturé" : "Unbilled")
                                }
                              </Badge>
                            )}
                          </TableCell>
                          {/* Approval column - only show if user can view all */}
                          {permissions.canViewAll && (
                            <TableCell>
                              {isApproved ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {language === "fr" ? "Approuvé" : "Approved"}
                                      </Badge>
                                      {canApproveEntry && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => unapproveTimeEntry(entry.id)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {language === "fr" ? "Par" : "By"}: {(entry as any).approved_by_profile?.display_name || (entry as any).approved_by_profile?.username || (language === "fr" ? "Inconnu" : "Unknown")}
                                      <br />
                                      {format(new Date((entry as any).approved_at), "d MMM yyyy HH:mm", { locale: language === "fr" ? fr : undefined })}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : canApproveEntry ? (
                                <Button
                                  size="sm"
                                  onClick={() => approveTimeEntry(entry.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {language === "fr" ? "Approuver" : "Approve"}
                                </Button>
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex gap-1">
                              {canEdit && !showArchived && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(entry)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && !showArchived && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTimeEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Archive button - only for billed entries */}
                              {entry.is_billed && !showArchived && permissions.canMarkAsBilled && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => archiveTimeEntry(entry.id)}
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === "fr" ? "Archiver" : "Archive"}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* Unarchive button */}
                              {showArchived && permissions.canMarkAsBilled && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => unarchiveTimeEntry(entry.id)}
                                    >
                                      <ArchiveRestore className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {language === "fr" ? "Désarchiver" : "Unarchive"}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {entry.is_billed && !canEdit && !showArchived && (
                                <PermissionDeniedTooltip message={language === "fr" ? "Entrée facturée - lecture seule" : "Billed entry - read only"}>
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                </PermissionDeniedTooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {/* Select All on Mobile - show for invoice or archive mode */}
                {((permissions.canLinkToInvoice && selectionMode === "invoice") || 
                  (permissions.canMarkAsBilled && selectionMode === "archive")) && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={allSameClientSelected && selectedEntries.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label={language === "fr" ? "Tout sélectionner" : "Select all"}
                      disabled={selectableEntries.length === 0}
                      className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                      {...(someSelected && { "data-state": "indeterminate" })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectionMode === "archive" 
                        ? (language === "fr" ? "Sélectionner pour archiver" : "Select to archive")
                        : (language === "fr" ? "Tout sélectionner" : "Select all")
                      }
                    </span>
                  </div>
                )}

                {/* Date sort button for mobile */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setDateSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  >
                    {language === "fr" ? "Tri par date" : "Sort by date"}
                    {dateSortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </div>

                {sortedEntries.map((entry) => {
                  const [year, month, day] = entry.date.split('-').map(Number);
                  const localDate = new Date(year, month - 1, day);
                  const formattedDate = format(localDate, "d MMM yyyy", {
                    locale: language === "fr" ? fr : undefined,
                  });
                  const canEdit = permissions.canEditEntry(entry.user_id, entry.is_billed);
                  const canDelete = permissions.canDeleteEntry(entry.user_id, entry.is_billed);
                  const isApproved = !!(entry as any).approved_at;
                  const canApproveEntry = permissions.canApprove && entry.user_id !== user?.id;
                  
                  return (
                    <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {/* Checkbox - show for unbilled in invoice mode or billed in archive mode */}
                          {((selectionMode === "invoice" && !entry.is_billed && permissions.canLinkToInvoice) || 
                            (selectionMode === "archive" && entry.is_billed && !(entry as any).is_archived && permissions.canMarkAsBilled)) && (
                            <Checkbox
                              checked={selectedEntries.includes(entry.id)}
                              onCheckedChange={() => toggleSelection(entry.id)}
                              disabled={selectionMode === "invoice" && selectedClientId !== null && entry.client_id !== selectedClientId}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{entry.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.clients?.name || "-"}
                            </div>
                            {permissions.canViewAll && entry.user_id !== user?.id && (
                              <div className="text-xs text-primary">
                                {language === "fr" ? "Par" : "By"}: {entry.profiles?.username || entry.profiles?.display_name || (language === "fr" ? "Inconnu" : "Unknown")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {canEdit && !showArchived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && !showArchived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteTimeEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Archive button - only for billed entries */}
                          {entry.is_billed && !showArchived && permissions.canMarkAsBilled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => archiveTimeEntry(entry.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Unarchive button */}
                          {showArchived && permissions.canMarkAsBilled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => unarchiveTimeEntry(entry.id)}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          )}
                          {entry.is_billed && !canEdit && !showArchived && (
                            <Lock className="h-4 w-4 text-muted-foreground mt-2" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">{formattedDate}</span>
                        <span>
                          {(() => {
                            const rawMin = (entry as any).duration_raw_minutes;
                            const billedMin = (entry as any).duration_billed_minutes;
                            const isTimerEntry = (entry as any).source === 'timer';
                            const hasRounding = isTimerEntry && rawMin !== null && billedMin !== null && rawMin !== billedMin;
                            
                            if (hasRounding) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help">
                                        {entry.hours}h
                                        <span className="ml-0.5 text-xs text-primary">≈</span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        {language === "fr" ? "Temps réel" : "Actual"}: {minutesToHours(rawMin)}h
                                        <br />
                                        {language === "fr" ? "Facturable" : "Billable"}: {minutesToHours(billedMin)}h
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return `${entry.hours}h`;
                          })()}
                          {" × $"}{entry.hourly_rate}
                        </span>
                        <span className="font-semibold">${(entry.hours * entry.hourly_rate).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* Status dropdown - only editable if user can mark as billed */}
                        {permissions.canMarkAsBilled ? (
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
                            <SelectTrigger className="flex-1 h-8 text-sm">
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
                        ) : (
                          <Badge variant={entry.is_billed ? "default" : "secondary"}>
                            {entry.is_billed 
                              ? (language === "fr" ? "Facturé" : "Billed")
                              : (language === "fr" ? "Non facturé" : "Unbilled")
                            }
                          </Badge>
                        )}
                        
                        {/* Approval status for mobile */}
                        {permissions.canViewAll && (
                          <>
                            {isApproved ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {language === "fr" ? "Approuvé" : "Approved"}
                                </Badge>
                                {canApproveEntry && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => unapproveTimeEntry(entry.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ) : canApproveEntry ? (
                              <Button
                                size="sm"
                                onClick={() => approveTimeEntry(entry.id)}
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {language === "fr" ? "Approuver" : "Approve"}
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
                      
                      {/* Show rounding info when timer entry has rounding applied */}
                      {timerEntryData?.isFromTimer && timerEntryData.durationRawMinutes !== timerEntryData.durationBilledMinutes && (
                        <div className="mt-2 p-2 bg-primary/10 rounded-md text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">{language === "fr" ? "Arrondi appliqué" : "Rounding applied"}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {language === "fr" ? "Temps réel" : "Actual"}: {minutesToHours(timerEntryData.durationRawMinutes)}h →{" "}
                            {language === "fr" ? "Facturable" : "Billable"}: {minutesToHours(timerEntryData.durationBilledMinutes)}h
                          </div>
                        </div>
                      )}
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
              {language === "fr" ? "Démarrer la minuterie" : "Start Timer"}
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
