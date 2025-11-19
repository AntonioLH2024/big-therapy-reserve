import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Calendar, CheckCircle, XCircle, Clock, Euro, TrendingUp } from "lucide-react";

interface Stats {
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
}

interface BillingStats {
  totalIncome: number;
  paidInvoices: number;
  pendingInvoices: number;
  cancelledInvoices: number;
  avgInvoiceAmount: number;
}

interface MonthlyIncome {
  mes: string;
  ingresos: number;
}

interface AppointmentByDate {
  fecha: string;
  total: number;
}

interface ServiceStats {
  servicio: string;
  total: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const CRMDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingAppointments: 0,
  });
  const [appointmentsByDate, setAppointmentsByDate] = useState<AppointmentByDate[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [billingStats, setBillingStats] = useState<BillingStats>({
    totalIncome: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    cancelledInvoices: 0,
    avgInvoiceAmount: 0,
  });
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome[]>([]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchBillingStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Obtener todas las citas del psicólogo
      const { data: appointments, error: appointmentsError } = await supabase
        .from("citas")
        .select("*")
        .eq("psicologo_id", user!.id);

      if (appointmentsError) throw appointmentsError;

      // Calcular estadísticas
      const uniquePatients = new Set(appointments?.map(a => a.paciente_id) || []);
      const completed = appointments?.filter(a => a.estado === "completada").length || 0;
      const cancelled = appointments?.filter(a => a.estado === "cancelada").length || 0;
      const pending = appointments?.filter(a => a.estado === "programada").length || 0;

      setStats({
        totalPatients: uniquePatients.size,
        totalAppointments: appointments?.length || 0,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        pendingAppointments: pending,
      });

      // Agrupar citas por fecha (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAppointments = appointments?.filter(
        a => new Date(a.fecha_hora) >= thirtyDaysAgo
      ) || [];

      const dateGroups = recentAppointments.reduce((acc, curr) => {
        const date = new Date(curr.fecha_hora).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setAppointmentsByDate(
        Object.entries(dateGroups).map(([fecha, total]) => ({ fecha, total }))
      );

      // Agrupar por servicio
      const serviceGroups = appointments?.reduce((acc, curr) => {
        acc[curr.servicio] = (acc[curr.servicio] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setServiceStats(
        Object.entries(serviceGroups).map(([servicio, total]) => ({ servicio, total }))
      );

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingStats = async () => {
    try {
      // Obtener todas las facturas del psicólogo
      const { data: invoices, error: invoicesError } = await supabase
        .from("facturas")
        .select("*")
        .eq("psicologo_id", user!.id);

      if (invoicesError) throw invoicesError;

      // Calcular estadísticas de facturación
      const paid = invoices?.filter(i => i.estado === "pagada") || [];
      const pending = invoices?.filter(i => i.estado === "pendiente") || [];
      const cancelled = invoices?.filter(i => i.estado === "cancelada") || [];
      
      const totalIncome = paid.reduce((sum, inv) => sum + Number(inv.monto), 0);
      const avgAmount = paid.length > 0 ? totalIncome / paid.length : 0;

      setBillingStats({
        totalIncome,
        paidInvoices: paid.length,
        pendingInvoices: pending.length,
        cancelledInvoices: cancelled.length,
        avgInvoiceAmount: avgAmount,
      });

      // Agrupar ingresos por mes (últimos 12 meses)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const recentPaidInvoices = paid.filter(
        i => new Date(i.fecha_emision) >= twelveMonthsAgo
      );

      const monthGroups = recentPaidInvoices.reduce((acc, curr) => {
        const date = new Date(curr.fecha_emision);
        const monthYear = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        acc[monthYear] = (acc[monthYear] || 0) + Number(curr.monto);
        return acc;
      }, {} as Record<string, number>);

      setMonthlyIncome(
        Object.entries(monthGroups)
          .map(([mes, ingresos]) => ({ mes, ingresos }))
          .sort((a, b) => {
            const dateA = new Date(a.mes);
            const dateB = new Date(b.mes);
            return dateA.getTime() - dateB.getTime();
          })
      );

    } catch (error) {
      console.error("Error fetching billing stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const statusData = [
    { name: "Completadas", value: stats.completedAppointments },
    { name: "Programadas", value: stats.pendingAppointments },
    { name: "Canceladas", value: stats.cancelledAppointments },
  ];

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledAppointments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de Facturación */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{billingStats.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              De facturas pagadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingStats.paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Completadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingStats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Por cobrar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Factura</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{billingStats.avgInvoiceAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor medio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Ingresos Mensuales */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Mensuales</CardTitle>
          <CardDescription>Evolución de ingresos en los últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyIncome}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="mes" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ingresos']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Ingresos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de citas por fecha */}
        <Card>
          <CardHeader>
            <CardTitle>Citas en los últimos 30 días</CardTitle>
            <CardDescription>Evolución diaria de citas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appointmentsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Citas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de estado de citas */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de las Citas</CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de servicios */}
        {serviceStats.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Servicios Más Solicitados</CardTitle>
              <CardDescription>Distribución de citas por tipo de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="servicio" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Citas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
