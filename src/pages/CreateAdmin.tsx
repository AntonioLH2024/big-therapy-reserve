import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CreateAdmin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createAdminUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: "admin@app.com",
          password: "123456",
          userData: {
            nombre: "Admin",
            apellidos: "Sistema",
            telefono: "+34 600 000 000",
            role: "admin",
          },
        },
      });

      if (error) throw error;

      toast.success("Usuario administrador creado exitosamente");
      console.log("Admin user created:", data);
      
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear usuario administrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="text-center text-foreground">
            Crear Usuario Administrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground space-y-2">
            <p><strong>Email:</strong> admin@app.com</p>
            <p><strong>Contraseña:</strong> 123456</p>
            <p><strong>Rol:</strong> Administrador</p>
          </div>
          <Button
            onClick={createAdminUser}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? "Creando..." : "Crear Usuario Admin"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="w-full text-muted-foreground"
          >
            Volver a Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAdmin;
