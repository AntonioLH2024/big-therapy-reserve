import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Users, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Servicios = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Brain,
      title: "Consulta Individual",
      description:
        "Sesiones personalizadas diseñadas para abordar tus preocupaciones específicas y promover tu desarrollo personal.",
      details: [
        "Evaluación inicial completa",
        "Plan de tratamiento personalizado",
        "Seguimiento continuo",
        "Técnicas basadas en evidencia científica",
      ],
      duration: "50 minutos",
      price: "Desde 60€",
    },
    {
      icon: Users,
      title: "Terapia de Parejas",
      description:
        "Fortalece tu relación con el apoyo de especialistas en terapia de pareja.",
      details: [
        "Mejora de la comunicación",
        "Resolución de conflictos",
        "Fortalecimiento del vínculo",
        "Estrategias de afrontamiento conjunto",
      ],
      duration: "60 minutos",
      price: "Desde 80€",
    },
    {
      icon: FileText,
      title: "Evaluación Psicológica e Informe",
      description:
        "Evaluación completa con informe detallado para diagnósticos precisos.",
      details: [
        "Tests psicológicos validados",
        "Entrevista clínica estructurada",
        "Informe profesional detallado",
        "Recomendaciones de tratamiento",
      ],
      duration: "2-3 sesiones",
      price: "Desde 150€",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-primary cursor-pointer"
            onClick={() => navigate("/")}
          >
            Big Citas
          </h1>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="/"
              className="text-foreground hover:text-primary transition-colors"
            >
              Inicio
            </a>
            <a
              href="#"
              className="text-primary transition-colors"
            >
              Servicios
            </a>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Iniciar Sesión
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-background to-card">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Nuestros Servicios
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ofrecemos atención psicológica profesional con especialistas certificados
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="space-y-12 max-w-5xl mx-auto">
            {services.map((service, index) => (
              <Card
                key={index}
                className="bg-card border-border overflow-hidden hover:border-primary transition-all duration-300"
              >
                <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent pb-8">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <service.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-3xl mb-2 text-foreground">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="text-lg text-muted-foreground">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold mb-3 text-foreground">
                        ¿Qué incluye?
                      </h4>
                      <ul className="space-y-2">
                        {service.details.map((detail, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-muted-foreground"
                          >
                            <span className="text-primary mt-1">•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="bg-background rounded-lg p-6 mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-muted-foreground">Duración:</span>
                          <span className="font-semibold text-foreground">
                            {service.duration}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Precio:</span>
                          <span className="font-semibold text-primary text-xl">
                            {service.price}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-primary hover:bg-primary/90"
                        size="lg"
                        onClick={() => navigate("/auth")}
                      >
                        Reservar Cita
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-16">
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
                  <a href="/" className="hover:text-primary transition-colors">
                    Inicio
                  </a>
                </li>
                <li>
                  <a href="/servicios" className="hover:text-primary transition-colors">
                    Servicios
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
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Servicios;
