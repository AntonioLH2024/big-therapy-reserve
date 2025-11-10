import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

export const ScheduleConfig = () => {
  const [schedule, setSchedule] = useState({
    lunes: { inicio: "09:00", fin: "18:00", activo: true },
    martes: { inicio: "09:00", fin: "18:00", activo: true },
    miercoles: { inicio: "09:00", fin: "18:00", activo: true },
    jueves: { inicio: "09:00", fin: "18:00", activo: true },
    viernes: { inicio: "09:00", fin: "18:00", activo: true },
    sabado: { inicio: "09:00", fin: "14:00", activo: false },
    domingo: { inicio: "09:00", fin: "14:00", activo: false },
  });

  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

  const handleSave = () => {
    toast.success("Horario guardado exitosamente");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Configuración de Horarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dias.map((dia) => (
          <div key={dia} className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-foreground capitalize">{dia}</Label>
            <Input
              type="time"
              className="bg-background border-border text-foreground"
              value={schedule[dia as keyof typeof schedule].inicio}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  [dia]: { ...schedule[dia as keyof typeof schedule], inicio: e.target.value },
                })
              }
            />
            <Input
              type="time"
              className="bg-background border-border text-foreground"
              value={schedule[dia as keyof typeof schedule].fin}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  [dia]: { ...schedule[dia as keyof typeof schedule], fin: e.target.value },
                })
              }
            />
            <Button
              variant={schedule[dia as keyof typeof schedule].activo ? "default" : "outline"}
              onClick={() =>
                setSchedule({
                  ...schedule,
                  [dia]: { ...schedule[dia as keyof typeof schedule], activo: !schedule[dia as keyof typeof schedule].activo },
                })
              }
            >
              {schedule[dia as keyof typeof schedule].activo ? "Activo" : "Inactivo"}
            </Button>
          </div>
        ))}
        <Button onClick={handleSave} className="w-full">
          Guardar Horario
        </Button>
      </CardContent>
    </Card>
  );
};
