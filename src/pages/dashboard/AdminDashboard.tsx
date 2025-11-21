import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, UserCog, LogOut, BarChart3 } from "lucide-react";
import { PsychologistsManager } from "@/components/admin/PsychologistsManager";
import { PatientsManager } from "@/components/admin/PatientsManager";
import { AppointmentsManager } from "@/components/admin/AppointmentsManager";
import { PsychologistStats } from "@/components/admin/PsychologistStats";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "psychologists";
  const [stats, setStats] = useState({
    psychologists: 0,
    patients: 0,
    todayAppointments: 0,
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== "admin")) {
      navigate("/auth");
    }
    if (user && userRole === "admin") {
      fetchStats();
    }
  }, [user, userRole, loading, navigate]);

  const fetchStats = async () => {
    // Count psychologists
    const { count: psychologistsCount } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "psicologo");

    // Count patients
    const { count: patientsCount } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "paciente");

    // Count today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: appointmentsCount } = await supabase
      .from("citas")
      .select("*", { count: "exact", head: true })
      .gte("fecha_hora", today.toISOString())
      .lt("fecha_hora", tomorrow.toISOString());

    setStats({
      psychologists: psychologistsCount || 0,
      patients: patientsCount || 0,
      todayAppointments: appointmentsCount || 0,
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground">Cargando...</p>
    </div>;
  }

  const renderContent = () => {
    switch (currentTab) {
      case "patients":
        return <PatientsManager />;
      case "appointments":
        return <AppointmentsManager />;
      case "stats":
        return <PsychologistStats />;
      default:
        return <PsychologistsManager />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
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
                <span className="text-foreground">Admin Dashboard</span>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Panel de Administración</h2>
              <p className="text-muted-foreground">Gestiona psicólogos, pacientes y citas</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Psicólogos
                  </CardTitle>
                  <UserCog className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.psychologists}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Pacientes
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.patients}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Citas Hoy
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.todayAppointments}</div>
                </CardContent>
              </Card>
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

export default AdminDashboard;
