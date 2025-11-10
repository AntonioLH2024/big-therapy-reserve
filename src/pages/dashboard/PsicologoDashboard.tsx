import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, LogOut } from "lucide-react";

const PsicologoDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || userRole !== "psicologo")) {
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
            <span className="text-foreground">Panel del Psicólogo</span>
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
          <p className="text-muted-foreground">Gestiona tus citas y pacientes</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Citas Hoy
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mis Pacientes
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Funcionalidades Próximamente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Gestión de citas del día (CRUD)</li>
              <li>• Listado de todos tus pacientes</li>
              <li>• Configuración de calendario y horarios</li>
              <li>• Actualización de perfil profesional</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PsicologoDashboard;
