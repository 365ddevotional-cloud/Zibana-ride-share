import { Link } from "wouter";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sidebarSections } from "./admin-sidebar";
import { ZibaAiAssistant } from "@/components/admin/ziba-ai-assistant";

interface AdminLayoutProps {
  children: React.ReactNode;
  userRole: string;
  activeTab?: string;
}

export default function AdminLayout({ children, userRole, activeTab }: AdminLayoutProps) {
  const { user, logout } = useAuth();

  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const isSuperAdmin = userRole === "super_admin";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar collapsible="icon" className="admin-executive-sidebar">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
          </div>
          <SidebarContent>
            {sidebarSections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeTab === item.value || item.route.split("/").pop() === activeTab}
                          data-active={activeTab === item.value || item.route.split("/").pop() === activeTab}
                          data-testid={`nav-${item.value}`}
                        >
                          <Link href={item.route}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 border-b px-5 py-2.5 sticky top-0 z-50 admin-header-glass shadow-sm" data-testid="admin-header">
            <div className="flex items-center gap-3 flex-wrap">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Separator orientation="vertical" className="h-5" />
              <span className="text-sm font-semibold tracking-tight text-foreground" data-testid="text-admin-title">
                Admin Dashboard
              </span>
              {isSuperAdmin && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white rounded-full px-3 py-0.5 text-xs font-semibold shadow-sm no-default-hover-elevate no-default-active-elevate"
                  data-testid="badge-super-admin"
                >
                  Super Admin
                </Badge>
              )}
              {!isSuperAdmin && (
                <Badge variant="secondary" data-testid="badge-admin-role">
                  {userRole}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <NotificationBell />
              <ThemeToggle />
              <ProfileDropdown
                user={user ?? null}
                role={(userRole as any) || "admin"}
                onLogout={() => logout()}
              />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-8 py-8">
              {children}
            </div>
          </main>
        </div>
        <ZibaAiAssistant />
      </div>
    </SidebarProvider>
  );
}
