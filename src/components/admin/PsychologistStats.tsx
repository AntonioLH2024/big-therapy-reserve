import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Users, Euro, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, subWeeks, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface Psychologist {
  id: string;
  nombre: string;
  apellidos: string;
}

interface AppointmentData {
  date: string;
  count: number;
  completed: number;
  cancelled: number;
}

interface RevenueData {
  date: string;
  amount: number;
}

export function PsychologistStats() {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    totalRevenue: 0,
  });
  const [appointmentsData, setAppointmentsData] = useState<AppointmentData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);

  useEffect(() => {
    fetchPsychologists();
  }, []);

  useEffect(() => {
    if (selectedPsychologist) {
      fetchStats();
    }
  }, [selectedPsychologist, timeRange]);

  const fetchPsychologists = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner(id, nombre, apellidos)
      `)
      .eq("role", "psicologo");

    if (error) {
      console.error("Error fetching psychologists:", error);
      return;
    }

    const psychologists = data.map((item: any) => ({
      id: item.profiles.id,
      nombre: item.profiles.nombre,
      apellidos: item.profiles.apellidos,
    }));

    setPsychologists(psychologists);
    if (psychologists.length > 0 && !selectedPsychologist) {
      setSelectedPsychologist(psychologists[0].id);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();
    const startDate = timeRange === "week" 
      ? startOfWeek(subWeeks(now, 4), { locale: es })
      : startOfMonth(subMonths(now, 3));
    const endDate = now;

    // Fetch appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from("citas")
      .select("*")
      .eq("psicologo_id", selectedPsychologist)
      .gte("fecha_hora", startDate.toISOString())
      .lte("fecha_hora", endDate.toISOString());

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      setLoading(false);
      return;
    }

    // Fetch invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from("facturas")
      .select("*")
      .eq("psicologo_id", selectedPsychologist)
      .gte("fecha_emision", startDate.toISOString())
      .lte("fecha_emision", endDate.toISOString())
      .eq("estado", "pagada");

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
    }

    // Count unique patients
    const uniquePatients = new Set(appointments?.map(apt => apt.paciente_id) || []).size;

    // Calculate stats
    const totalAppointments = appointments?.length || 0;
    const completedAppointments = appointments?.filter(apt => apt.estado === "completada").length || 0;
    const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;

    setStats({
      totalAppointments,
      completedAppointments,
      totalPatients: uniquePatients,
      totalRevenue,
    });

    // Process appointments data for chart
    const appointmentsMap = new Map<string, { count: number; completed: number; cancelled: number }>();
    
    appointments?.forEach(apt => {
      const dateKey = timeRange === "week"
        ? format(new Date(apt.fecha_hora), "'Semana' w", { locale: es })
        : format(new Date(apt.fecha_hora), "MMM yyyy", { locale: es });
      
      const current = appointmentsMap.get(dateKey) || { count: 0, completed: 0, cancelled: 0 };
      current.count++;
      if (apt.estado === "completada") current.completed++;
      if (apt.estado === "cancelada") current.cancelled++;
      appointmentsMap.set(dateKey, current);
    });

    const appointmentsChartData: AppointmentData[] = Array.from(appointmentsMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      completed: data.completed,
      cancelled: data.cancelled,
    }));

    setAppointmentsData(appointmentsChartData);

    // Process revenue data for chart
    const revenueMap = new Map<string, number>();
    
    invoices?.forEach(inv => {
      const dateKey = timeRange === "week"
        ? format(new Date(inv.fecha_emision), "'Semana' w", { locale: es })
        : format(new Date(inv.fecha_emision), "MMM yyyy", { locale: es });
      
      const current = revenueMap.get(dateKey) || 0;
      revenueMap.set(dateKey, current + Number(inv.total || 0));
    });

    const revenueChartData: RevenueData[] = Array.from(revenueMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    setRevenueData(revenueChartData);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Estadísticas por Psicólogo</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualiza métricas detalladas de citas, pacientes y cobros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Seleccionar Psicólogo
              </label>
              <Select value={selectedPsychologist} onValueChange={setSelectedPsychologist}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecciona un psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  {psychologists.map((psy) => (
                    <SelectItem key={psy.id} value={psy.id}>
                      {psy.nombre} {psy.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Período
              </label>
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "week" | "month")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="week">Por Semanas</TabsTrigger>
                  <TabsTrigger value="month">Por Meses</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPsychologist && !loading && (
        <>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Citas
                </CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.totalAppointments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedAppointments} completadas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pacientes Únicos
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.totalPatients}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ingresos Totales
                </CardTitle>
                <Euro className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.totalRevenue.toFixed(2)}€
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tasa de Finalización
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.totalAppointments > 0 
                    ? ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Evolución de Citas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Citas totales, completadas y canceladas por {timeRange === "week" ? "semana" : "mes"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={appointmentsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Completadas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cancelled" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Canceladas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Evolución de Ingresos</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ingresos de facturas pagadas por {timeRange === "week" ? "semana" : "mes"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => `${value.toFixed(2)}€`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="amount" 
                    fill="hsl(var(--chart-1))" 
                    name="Ingresos"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Cargando estadísticas...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
