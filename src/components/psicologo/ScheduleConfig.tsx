import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/integrations/supabase/auth";
import { Loader2 } from "lucide-react";

export const ScheduleConfig = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableHours, setAvailableHours] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generar horarios de 8:00 AM a 8:00 PM cada hora
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    if (user && selectedDate) {
      fetchAvailability();
    }
  }, [user, selectedDate]);

  const fetchAvailability = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('psicologo_horarios')
        .select('hora, disponible')
        .eq('psicologo_id', user.id)
        .eq('fecha', dateStr)
        .eq('disponible', true);

      if (error) throw error;

      const hours = new Set(data?.map(item => item.hora.substring(0, 5)) || []);
      setAvailableHours(hours);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Error al cargar la disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const toggleHour = (hour: string) => {
    const newHours = new Set(availableHours);
    if (newHours.has(hour)) {
      newHours.delete(hour);
    } else {
      newHours.add(hour);
    }
    setAvailableHours(newHours);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Eliminar todos los horarios del día seleccionado
      await supabase
        .from('psicologo_horarios')
        .delete()
        .eq('psicologo_id', user.id)
        .eq('fecha', dateStr);

      // Insertar los nuevos horarios disponibles
      if (availableHours.size > 0) {
        const horariosData = Array.from(availableHours).map(hora => ({
          psicologo_id: user.id,
          fecha: dateStr,
          hora: hora + ':00',
          disponible: true
        }));

        const { error } = await supabase
          .from('psicologo_horarios')
          .insert(horariosData);

        if (error) throw error;
      }

      toast.success('Disponibilidad guardada exitosamente');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Error al guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendario */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Selecciona un Día</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={es}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-md border border-border"
          />
        </CardContent>
      </Card>

      {/* Selección de horas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Horarios Disponibles - {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((hour) => (
                  <Button
                    key={hour}
                    variant={availableHours.has(hour) ? "default" : "outline"}
                    onClick={() => toggleHour(hour)}
                    className="w-full"
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
