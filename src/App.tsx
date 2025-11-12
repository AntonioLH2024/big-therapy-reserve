import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/integrations/supabase/auth";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Servicios from "./pages/Servicios";
import Auth from "./pages/Auth";
import CreateAdmin from "./pages/CreateAdmin";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import PsicologoDashboard from "./pages/dashboard/PsicologoDashboard";
import PacienteDashboard from "./pages/dashboard/PacienteDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/servicios" element={<Servicios />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/create-admin" element={<CreateAdmin />} />
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/psicologo" element={<PsicologoDashboard />} />
              <Route path="/dashboard/paciente" element={<PacienteDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
