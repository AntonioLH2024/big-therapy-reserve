import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, History, User } from "lucide-react";
import { NextAppointment } from "@/components/paciente/NextAppointment";
import { AppointmentHistory } from "@/components/paciente/AppointmentHistory";
import { ProfileEditor } from "@/components/paciente/ProfileEditor";

const PacienteDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || userRole !== "paciente")) {
      navigate("/auth");
    }
  }, [user, userRole, loading, navigate]);

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
            <span className="text-foreground">Mi Panel</span>
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
          <p className="text-muted-foreground">Gestiona tus citas y perfil</p>
        </div>

        <Tabs defaultValue="proxima" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="proxima" className="gap-2">
              <Calendar className="h-4 w-4" />
              Próxima Cita
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="perfil" className="gap-2">
              <User className="h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proxima" className="space-y-6">
            <NextAppointment />
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => navigate("/servicios")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Buscar Psicólogo
            </Button>
          </TabsContent>

          <TabsContent value="historial">
            <AppointmentHistory />
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
