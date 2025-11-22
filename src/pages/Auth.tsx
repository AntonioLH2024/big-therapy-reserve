import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-therapy.jpg";
const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muy largo"),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100, "Contraseña muy larga")
});
const signupSchema = authSchema.extend({
  nombre: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(100, "Apellidos muy largos"),
  telefono: z.string().regex(/^[+]?[0-9\s-]{9,20}$/, "Teléfono inválido"),
  role: z.enum(["paciente", "psicologo"], {
    required_error: "Selecciona un rol"
  })
});
const Auth = () => {
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const validated = authSchema.parse({
        email,
        password
      });
      await signIn(validated.email, validated.password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("signupEmail") as string;
    const password = formData.get("signupPassword") as string;
    const nombre = formData.get("firstName") as string;
    const apellidos = formData.get("lastName") as string;
    const telefono = formData.get("phone") as string;
    const role = formData.get("role") as string;
    try {
      const validated = signupSchema.parse({
        email,
        password,
        nombre,
        apellidos,
        telefono,
        role
      });
      await signUp(validated.email, validated.password, {
        nombre: validated.nombre,
        apellidos: validated.apellidos,
        telefono: validated.telefono,
        role: validated.role
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("resetEmail") as string;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Se ha enviado un enlace de recuperación a tu email");
      setShowPasswordReset(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar el email de recuperación");
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${heroImage})`
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80" />
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 cursor-pointer" onClick={() => navigate("/")}>
            Centro de psicología Reservas
          </h1>
          <p className="text-muted-foreground">Accede a tu cuenta</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            {!showPasswordReset ? (
              <Card className="bg-card/95 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="tu@email.com" required className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" name="password" type="password" required className="bg-background" />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-sm text-primary px-0"
                        onClick={() => setShowPasswordReset(true)}
                      >
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                      {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/95 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Recuperar Contraseña</CardTitle>
                  <CardDescription>
                    Te enviaremos un enlace para restablecer tu contraseña
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <Input 
                        id="resetEmail" 
                        name="resetEmail" 
                        type="email" 
                        placeholder="tu@email.com" 
                        required 
                        className="bg-background" 
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowPasswordReset(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-primary hover:bg-primary/90" 
                        disabled={loading}
                      >
                        {loading ? "Enviando..." : "Enviar enlace"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="signup">
            <Card className="bg-card/95 backdrop-blur border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Crear Cuenta</CardTitle>
                <CardDescription>
                  Completa tus datos para registrarte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input id="firstName" name="firstName" type="text" required className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellidos</Label>
                      <Input id="lastName" name="lastName" type="text" required className="bg-background" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input id="signupEmail" name="signupEmail" type="email" placeholder="tu@email.com" required className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+34 600 000 000" required className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Usuario</Label>
                    <Select name="role" defaultValue="paciente" required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecciona tu rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paciente">Paciente</SelectItem>
                        <SelectItem value="psicologo">Psicólogo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Contraseña</Label>
                    <Input id="signupPassword" name="signupPassword" type="password" required className="bg-background" />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </Button>
        </div>
      </div>
    </div>;
};
export default Auth;