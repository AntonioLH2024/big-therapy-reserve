import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { NextAppointment } from "@/components/paciente/NextAppointment";
import { AppointmentHistory } from "@/components/paciente/AppointmentHistory";
import { ProfileEditor } from "@/components/paciente/ProfileEditor";
import { PsychologistBrowser } from "@/components/paciente/PsychologistBrowser";
import { InvoicesView } from "@/components/paciente/InvoicesView";
import { PatientSidebar } from "@/components/paciente/PatientSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const PacienteDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, signOut, loading } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [showPsychologistBrowser, setShowPsychologistBrowser] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "proxima";

  useEffect(() => {
    if (!loading && (!user || userRole !== "paciente")) {
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
      case "historial":
        return <AppointmentHistory />;
      case "facturas":
        return <InvoicesView />;
      case "perfil":
        return <ProfileEditor />;
      case "proxima":
      default:
        return (
          <div className="space-y-6">
            <NextAppointment />
            <Button 
              onClick={() => setShowPsychologistBrowser(true)}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Buscar Psicólogo
            </Button>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PatientSidebar />

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
                  <span className="text-sm text-muted-foreground">Mi Panel</span>
                </div>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Mi Panel</h2>
              {userName && (
                <p className="text-lg font-medium text-foreground mb-1">{userName}</p>
              )}
              <p className="text-muted-foreground">Gestiona tus citas y perfil</p>
            </div>

            {renderContent()}
          </main>
        </div>
      </div>

      <PsychologistBrowser 
        open={showPsychologistBrowser} 
        onOpenChange={setShowPsychologistBrowser} 
      />
    </SidebarProvider>
  );
};

export default PacienteDashboard;
