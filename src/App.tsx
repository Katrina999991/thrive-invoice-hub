import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import PasswordChangeDialog from "@/components/PasswordChangeDialog";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Clients from "./pages/Clients";
import Categories from "./pages/Categories";
import Products from "./pages/Products";
import StockManagement from "./pages/StockManagement";
import Quotes from "./pages/Quotes";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AuditLogs from "./pages/AuditLogs";
import TimeTracking from "./pages/TimeTracking";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import Software from "./pages/Software";
import PublicPricing from "./pages/PublicPricing";
import Comparison from "./pages/Comparison";
import ComparisonQuickBooks from "./pages/ComparisonQuickBooks";
import ComparisonWave from "./pages/ComparisonWave";
import ComparisonFreshBooks from "./pages/ComparisonFreshBooks";
import QuoteResponse from "./pages/QuoteResponse";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => {
  console.log("App component rendering");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <PasswordChangeDialog />
              <PWAInstallBanner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/software" element={<Software />} />
                <Route path="/pricing" element={<PublicPricing />} />
                <Route path="/comparison" element={<Comparison />} />
                <Route path="/comparison/quickbooks" element={<ComparisonQuickBooks />} />
                <Route path="/comparison/wave" element={<ComparisonWave />} />
                <Route path="/comparison/freshbooks" element={<ComparisonFreshBooks />} />
                <Route path="/quote/:token" element={<QuoteResponse />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="companies" element={<Companies />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="products" element={<Products />} />
                  <Route path="stock" element={<StockManagement />} />
                  <Route path="quotes" element={<Quotes />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="time-tracking" element={<TimeTracking />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
