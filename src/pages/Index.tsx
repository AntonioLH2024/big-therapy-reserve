import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Users, FileText, Calendar, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/auth";
import heroImage from "@/assets/hero-therapy.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const services = [
    {
      icon: Brain,
      title: "Consulta Individual",
      description: "Sesiones personalizadas enfocadas en tu bienestar mental y desarrollo personal.",
    },
    {
      icon: Users,
      title: "Terapia de Parejas",
      description: "Fortalece tu relación con apoyo profesional especializado.",
    },
    {
      icon: FileText,
      title: "Evaluación Psicológica",
      description: "Diagnósticos precisos e informes profesionales detallados.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Big Citas</h1>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#servicios" className="text-foreground hover:text-primary transition-colors">
              Servicios
            </a>
            <a href="#opiniones" className="text-foreground hover:text-primary transition-colors">
              Opiniones
            </a>
            <a href="#contacto" className="text-foreground hover:text-primary transition-colors">
              Contacto
            </a>
            {user ? (
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Iniciar Sesión
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 text-foreground leading-tight">
              Tu Bienestar Mental es Nuestra{" "}
              <span className="text-primary">Prioridad</span>
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-muted-foreground">
              Conecta con psicólogos especializados y reserva tu cita en minutos
            </p>
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate("/servicios")}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Reservar Cita
            </Button>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section id="servicios" className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4 text-foreground">Nuestros Servicios</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ofrecemos atención psicológica profesional adaptada a tus necesidades
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {services.map((service, index) => (
              <Card
                key={index}
                className="bg-background border-border hover:border-primary transition-all duration-300 cursor-pointer group"
                onClick={() => navigate("/servicios")}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-2xl font-bold mb-4 text-foreground">{service.title}</h4>
                  <p className="text-muted-foreground mb-6">{service.description}</p>
                  <Button variant="outline" className="w-full">
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/20 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6 text-foreground">
            ¿Listo para Comenzar tu Proceso?
          </h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Agenda tu primera cita hoy y da el primer paso hacia tu bienestar
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
            onClick={() => navigate("/servicios")}
          >
            Reservar Ahora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4 text-primary">Big Citas</h4>
              <p className="text-muted-foreground">
                Plataforma premium para reservar citas con psicólogos especializados
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4 text-foreground">Enlaces</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#servicios" className="hover:text-primary transition-colors">
                    Servicios
                  </a>
                </li>
                <li>
                  <a href="#opiniones" className="hover:text-primary transition-colors">
                    Opiniones
                  </a>
                </li>
                <li>
                  <a href="#contacto" className="hover:text-primary transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Aviso Legal
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; 2025 Big Citas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
