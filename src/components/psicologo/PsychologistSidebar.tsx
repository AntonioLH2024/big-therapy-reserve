import { BarChart3, Calendar, Users, Clock, User, CalendarDays, FileText, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "CRM", url: "/dashboard/psicologo?tab=crm", icon: BarChart3 },
  { title: "Citas", url: "/dashboard/psicologo?tab=appointments", icon: Calendar },
  { title: "Calendario", url: "/dashboard/psicologo?tab=calendar", icon: CalendarDays },
  { title: "Pacientes", url: "/dashboard/psicologo?tab=patients", icon: Users },
  { title: "Facturación", url: "/dashboard/psicologo?tab=billing", icon: FileText },
  { title: "Configuración Facturas", url: "/dashboard/psicologo?tab=billing-config", icon: Settings },
  { title: "Horarios", url: "/dashboard/psicologo?tab=schedule", icon: Clock },
  { title: "Perfil", url: "/dashboard/psicologo?tab=profile", icon: User },
];

export function PsychologistSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "crm";

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Panel del Psicólogo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
