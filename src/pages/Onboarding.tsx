import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Users, Package, FileText, ChevronDown, ChevronUp, Check, Download, Send, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Onboarding = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0); // 0 = welcome, 1-4 = steps
  const [loading, setLoading] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // Step 1 - Company
  const [companyName, setCompanyName] = useState("My Company");
  const [companyEmail, setCompanyEmail] = useState(user?.email || "");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  // Step 2 - Client
  const [clientName, setClientName] = useState("John Doe");
  const [clientEmail, setClientEmail] = useState("john@email.com");

  // Step 3 - Service
  const [serviceName, setServiceName] = useState("Web design");
  const [servicePrice, setServicePrice] = useState("500");

  // Created entities
  const [createdCompany, setCreatedCompany] = useState<any>(null);
  const [createdClient, setCreatedClient] = useState<any>(null);
  const [createdProduct, setCreatedProduct] = useState<any>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  const totalSteps = 4;

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Always create a minimal company so the user gets permissions
      const { data: company, error } = await supabase
        .from("companies")
        .insert({ name: "My Company", email: user.email || "", user_id: user.id })
        .select().single();
      if (error) throw error;
      localStorage.setItem("selectedCompanyId", company.id);
      localStorage.setItem("onboarding_completed", "true");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Skip setup error:", error);
      // If company creation fails (e.g. already exists), just proceed
      localStorage.setItem("onboarding_completed", "true");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Create demo company
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .insert({ name: "Demo Corp", email: user.email, user_id: user.id })
        .select().single();
      if (compErr) throw compErr;

      // Create demo clients
      const demoClients = [
        { name: "Alice Martin", email: "alice@example.com", company_id: company.id, user_id: user.id },
        { name: "Bob Wilson", email: "bob@example.com", company_id: company.id, user_id: user.id },
      ];
      await supabase.from("clients").insert(demoClients);

      // Create demo product
      await supabase.from("products").insert({
        name: "Consulting Service", price: 150, user_id: user.id, company_id: company.id
      });

      localStorage.setItem("onboarding_completed", "true");
      localStorage.setItem("selectedCompanyId", company.id);
      toast({ title: "Demo ready!", description: "Demo data has been loaded." });
      navigate("/dashboard");
    } catch (error) {
      console.error("Demo setup error:", error);
      toast({ title: "Error", description: "Failed to set up demo data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          email: companyEmail,
          address: companyAddress || null,
          phone: companyPhone || null,
          user_id: user.id,
        })
        .select().single();
      if (error) throw error;
      setCreatedCompany(data);
      localStorage.setItem("selectedCompanyId", data.id);
      setStep(2);
    } catch (error: any) {
      console.error("Company creation error:", error);
      toast({ title: "Error", description: error.message || "Failed to create company", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!user || !createdCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientName,
          email: clientEmail,
          company_id: createdCompany.id,
          user_id: user.id,
        })
        .select().single();
      if (error) throw error;
      setCreatedClient(data);
      setStep(3);
    } catch (error: any) {
      console.error("Client creation error:", error);
      toast({ title: "Error", description: error.message || "Failed to create client", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    if (!user || !createdCompany) return;
    setLoading(true);
    try {
      const price = parseFloat(servicePrice) || 500;
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: serviceName,
          price,
          user_id: user.id,
          company_id: createdCompany.id,
        })
        .select().single();
      if (error) throw error;
      setCreatedProduct(data);

      // Now auto-create the invoice
      const invoiceNumber = `${createdCompany.invoice_prefix || "INV"}-001`;
      const today = format(new Date(), "yyyy-MM-dd");
      const dueDate = format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd");

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          client_id: createdClient.id,
          user_id: user.id,
          issue_date: today,
          due_date: dueDate,
          subtotal: price,
          tax_amount: 0,
          tax_rate: 0,
          total: price,
          status: "draft",
        })
        .select().single();
      if (invErr) throw invErr;

      // Create invoice item
      await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        description: serviceName,
        quantity: 1,
        unit_price: price,
        total: price,
      });

      setCreatedInvoice(invoice);
      setStep(4);
    } catch (error: any) {
      console.error("Product/Invoice creation error:", error);
      toast({ title: "Error", description: error.message || "Failed to create service", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("onboarding_completed", "true");
    navigate("/dashboard");
  };

  const price = parseFloat(servicePrice) || 500;

  // Welcome screen
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center space-y-8 animate-in fade-in duration-500">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Let's get you paid in 60 seconds
            </h1>
            <p className="text-muted-foreground text-lg">
              Set up your company and send your first invoice
            </p>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full text-lg h-14 font-semibold"
              onClick={() => setStep(1)}
            >
              Start
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkip}
            >
              Skip
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDemoSetup}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Skip setup — explore demo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 animate-in fade-in duration-300">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <button onClick={handleSkip} className="hover:text-foreground transition-colors">Skip</button>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          {/* Step icons */}
          <div className="flex justify-between px-2 pt-1">
            {[Building2, Users, Package, FileText].map((Icon, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  i + 1 < step
                    ? "bg-primary text-primary-foreground"
                    : i + 1 === step
                    ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1 < step ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Company */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Step 1 — Your business</h2>
                <p className="text-muted-foreground text-sm">We just need a name to get started</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company name</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && !loading && companyName.trim() && handleStep1()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && companyName.trim() && handleStep1()}
                  />
                </div>

                {/* Optional fields */}
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Optional details
                </button>
                {showOptional && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="company-address">Address</Label>
                      <Input
                        id="company-address"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Phone</Label>
                      <Input
                        id="company-phone"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+1 555-0100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleStep1}
                disabled={loading || !companyName.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Client */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Step 2 — Add a client</h2>
                <p className="text-muted-foreground text-sm">Who are you billing?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Name</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && !loading && clientName.trim() && handleStep2()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && clientName.trim() && handleStep2()}
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleStep2}
                disabled={loading || !clientName.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Service */}
        {step === 3 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">What are you billing?</h2>
                <p className="text-muted-foreground text-sm">Add a service or product</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-name">Service name</Label>
                  <Input
                    id="service-name"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && !loading && serviceName.trim() && handleStep3()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-price">Price ($)</Label>
                  <Input
                    id="service-price"
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && serviceName.trim() && handleStep3()}
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleStep3}
                disabled={loading || !serviceName.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4 — Invoice Ready */}
        {step === 4 && createdInvoice && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-chart-2/20 flex items-center justify-center animate-in zoom-in duration-500">
                <Check className="w-7 h-7 text-chart-2" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Your invoice is ready 🎉</h2>
            </div>

            {/* Invoice Preview */}
            <Card className="border shadow-lg overflow-hidden">
              <div className="bg-primary/5 p-4 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground text-lg">{companyName}</p>
                    <p className="text-sm text-muted-foreground">{companyEmail}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded">
                    Invoice
                  </span>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Bill to</p>
                    <p className="font-medium text-foreground">{clientName}</p>
                    <p className="text-muted-foreground">{clientEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Invoice #</p>
                    <p className="font-medium text-foreground">{createdInvoice.invoice_number}</p>
                    <p className="text-muted-foreground mt-1">Date</p>
                    <p className="font-medium text-foreground">{format(new Date(), "MMM d, yyyy")}</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Price</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="p-2 text-foreground">{serviceName}</td>
                        <td className="p-2 text-right text-foreground">1</td>
                        <td className="p-2 text-right text-foreground">${price.toFixed(2)}</td>
                        <td className="p-2 text-right font-medium text-foreground">${price.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="text-right space-y-1">
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-lg font-bold border-t border-border pt-1">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">${price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => {
                  navigate(`/dashboard/invoices`);
                  localStorage.setItem("onboarding_completed", "true");
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  navigate(`/dashboard/invoices`);
                  localStorage.setItem("onboarding_completed", "true");
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Send invoice
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleFinish}
              >
                Go to dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
