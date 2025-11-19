import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { AppointmentsManager } from "@/components/psicologo/AppointmentsManager";
import { PatientsManager } from "@/components/psicologo/PatientsManager";
import { ScheduleConfig } from "@/components/psicologo/ScheduleConfig";
import { ProfileEditor } from "@/components/psicologo/ProfileEditor";
import { CalendarView } from "@/components/psicologo/CalendarView";
import { CRMDashboard } from "@/components/psicologo/CRMDashboard";
import { BillingManager } from "@/components/psicologo/BillingManager";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PsychologistSidebar } from "@/components/psicologo/PsychologistSidebar";

const PsicologoDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "crm";
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || userRole !== "psicologo")) {
      navigate("/auth");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("nombre, apellidos")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          setUserName(`${data.nombre} ${data.apellidos}`);
        }
      }
    };

    fetchUserName();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground">Cargando...</p>
    </div>;
  }

  const renderContent = () => {
    switch (currentTab) {
      case "appointments":
        return <AppointmentsManager />;
      case "calendar":
        return <CalendarView />;
      case "patients":
        return <PatientsManager />;
      case "billing":
        return <BillingManager />;
      case "schedule":
        return <ScheduleConfig />;
      case "profile":
        return <ProfileEditor />;
      default:
        return <CRMDashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PsychologistSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
                  Big Citas
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-foreground font-medium">{userName}</span>
                  <span className="text-sm text-muted-foreground">Panel del Psicólogo</span>
                </div>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Mi Panel</h2>
              {userName && (
                <p className="text-lg font-medium text-foreground mb-1">{userName}</p>
              )}
              <p className="text-muted-foreground">Gestiona tus citas, pacientes y perfil profesional</p>
            </div>

            <div className="space-y-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PsicologoDashboard;
