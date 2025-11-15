import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, Users, Clock, User, CalendarDays, BarChart3 } from "lucide-react";
import { AppointmentsManager } from "@/components/psicologo/AppointmentsManager";
import { PatientsManager } from "@/components/psicologo/PatientsManager";
import { ScheduleConfig } from "@/components/psicologo/ScheduleConfig";
import { ProfileEditor } from "@/components/psicologo/ProfileEditor";
import { CalendarView } from "@/components/psicologo/CalendarView";
import { CRMDashboard } from "@/components/psicologo/CRMDashboard";

const PsicologoDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();
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

        <Tabs defaultValue="crm" className="space-y-6">
          <TabsList className="bg-card border-border">
            <TabsTrigger value="crm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="citas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Citas
            </TabsTrigger>
            <TabsTrigger value="calendario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="pacientes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="horarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Horarios
            </TabsTrigger>
            <TabsTrigger value="perfil" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crm">
            <CRMDashboard />
          </TabsContent>

          <TabsContent value="citas">
            <AppointmentsManager />
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarView />
          </TabsContent>

          <TabsContent value="pacientes">
            <PatientsManager />
          </TabsContent>

          <TabsContent value="horarios">
            <ScheduleConfig />
          </TabsContent>

          <TabsContent value="perfil">
            <ProfileEditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PsicologoDashboard;
