import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar } from "lucide-react";
import { AppointmentScheduler } from "./AppointmentScheduler";

interface Psychologist {
  id: string;
  nombre: string;
  apellidos: string;
  detalles?: {
    biografia: string | null;
    especialidad: string[] | null;
    foto_url: string | null;
  };
}

interface PsychologistBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PsychologistBrowser = ({ open, onOpenChange }: PsychologistBrowserProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  const { data: psychologists, isLoading } = useQuery({
    queryKey: ["psychologists-with-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner(
            id, 
            nombre, 
            apellidos,
            psicologo_detalles(
              biografia,
              especialidad,
              foto_url
            )
          )
        `)
        .eq("role", "psicologo");

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.profiles.id,
        nombre: item.profiles.nombre,
        apellidos: item.profiles.apellidos,
        detalles: item.profiles.psicologo_detalles?.[0] || null,
      })) as Psychologist[];
    },
    enabled: open,
  });

  const filteredPsychologists = psychologists?.filter((psy) => {
    const fullName = `${psy.nombre} ${psy.apellidos}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesName = fullName.includes(search);
    const matchesSpecialty = psy.detalles?.especialidad?.some((esp) =>
      esp.toLowerCase().includes(search)
    );
    return matchesName || matchesSpecialty;
  });

  const handleSelectPsychologist = (psychologistId: string) => {
    setSelectedPsychologist(psychologistId);
    setShowScheduler(true);
  };

  const handleBack = () => {
    setShowScheduler(false);
    setSelectedPsychologist(null);
  };

  const handleAppointmentScheduled = () => {
    setShowScheduler(false);
    setSelectedPsychologist(null);
    onOpenChange(false);
  };

  if (showScheduler && selectedPsychologist) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Button variant="ghost" onClick={handleBack} className="mb-2">
                ← Volver a psicólogos
              </Button>
            </DialogTitle>
          </DialogHeader>
          <AppointmentScheduler 
            embedded 
            onAppointmentScheduled={handleAppointmentScheduled}
            defaultPsychologist={selectedPsychologist}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar Psicólogo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o especialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Psychologists List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando psicólogos...
            </div>
          ) : filteredPsychologists && filteredPsychologists.length > 0 ? (
            <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {filteredPsychologists.map((psy) => (
                <Card key={psy.id} className="hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={psy.detalles?.foto_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {psy.nombre[0]}
                          {psy.apellidos[0]}
                        </AvatarFallback>
                      </Avatar>

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">
                          {psy.nombre} {psy.apellidos}
                        </h3>

                        {/* Specialties */}
                        {psy.detalles?.especialidad && psy.detalles.especialidad.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {psy.detalles.especialidad.map((esp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {esp}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Bio */}
                        {psy.detalles?.biografia && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {psy.detalles.biografia}
                          </p>
                        )}

                        {/* Action Button */}
                        <Button
                          onClick={() => handleSelectPsychologist(psy.id)}
                          className="mt-3"
                          size="sm"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar Cita
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron psicólogos
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
