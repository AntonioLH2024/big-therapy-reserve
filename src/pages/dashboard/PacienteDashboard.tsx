import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, History, User, FileText } from "lucide-react";
import { NextAppointment } from "@/components/paciente/NextAppointment";
import { AppointmentHistory } from "@/components/paciente/AppointmentHistory";
import { ProfileEditor } from "@/components/paciente/ProfileEditor";
import { AppointmentScheduler } from "@/components/paciente/AppointmentScheduler";
import { InvoicesView } from "@/components/paciente/InvoicesView";

const PacienteDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();
  const [userName, setUserName] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            Big Citas
          </h1>
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Mi Panel</h2>
          {userName && (
            <p className="text-lg font-medium text-foreground mb-1">{userName}</p>
          )}
          <p className="text-muted-foreground">Gestiona tus citas y perfil</p>
        </div>

        <Tabs defaultValue="proxima" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="proxima" className="gap-2">
              <Calendar className="h-4 w-4" />
              Próxima Cita
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="facturas" className="gap-2">
              <FileText className="h-4 w-4" />
              Facturas
            </TabsTrigger>
            <TabsTrigger value="perfil" className="gap-2">
              <User className="h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proxima" className="space-y-6">
            <NextAppointment />
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="historial">
            <AppointmentHistory />
          </TabsContent>

          <TabsContent value="facturas">
            <InvoicesView />
          </TabsContent>

          <TabsContent value="perfil">
            <ProfileEditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PacienteDashboard;
