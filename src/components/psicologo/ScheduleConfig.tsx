import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/integrations/supabase/auth";
import { Loader2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const ScheduleConfig = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableHours, setAvailableHours] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [copying, setCopying] = useState(false);

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

  // Generar próximos 14 días para copiar (excluyendo el día seleccionado)
  const getNextDays = () => {
    const days: Date[] = [];
    for (let i = 1; i <= 14; i++) {
      const nextDay = addDays(selectedDate, i);
      days.push(nextDay);
    }
    return days;
  };

  const toggleDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const isSelected = selectedDays.some(d => format(d, 'yyyy-MM-dd') === dayStr);
    
    if (isSelected) {
      setSelectedDays(selectedDays.filter(d => format(d, 'yyyy-MM-dd') !== dayStr));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCopySchedule = async () => {
    if (!user || selectedDays.length === 0 || availableHours.size === 0) {
      toast.error('Selecciona al menos un día y asegúrate de tener horarios configurados');
      return;
    }

    setCopying(true);
    try {
      for (const targetDay of selectedDays) {
        const dateStr = format(targetDay, 'yyyy-MM-dd');

        // Eliminar horarios existentes del día destino
        await supabase
          .from('psicologo_horarios')
          .delete()
          .eq('psicologo_id', user.id)
          .eq('fecha', dateStr);

        // Insertar los horarios copiados
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

      toast.success(`Horario copiado a ${selectedDays.length} día(s)`);
      setCopyDialogOpen(false);
      setSelectedDays([]);
    } catch (error) {
      console.error('Error copying schedule:', error);
      toast.error('Error al copiar el horario');
    } finally {
      setCopying(false);
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
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  className="flex-1"
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
                <Button 
                  variant="outline"
                  onClick={() => setCopyDialogOpen(true)}
                  disabled={availableHours.size === 0}
                  title="Copiar horario a otros días"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para copiar horarios */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar horario a otros días</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona los días a los que quieres copiar el horario del{" "}
              <span className="font-medium text-foreground">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {getNextDays().map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDays.some(d => format(d, 'yyyy-MM-dd') === dayStr);
                return (
                  <div
                    key={dayStr}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleDay(day)}
                  >
                    <Checkbox checked={isSelected} />
                    <Label className="cursor-pointer text-sm">
                      {format(day, "EEE d MMM", { locale: es })}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCopySchedule} 
              disabled={copying || selectedDays.length === 0}
            >
              {copying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Copiando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiar a {selectedDays.length} día(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
