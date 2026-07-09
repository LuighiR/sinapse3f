"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BrainCircuitIcon,
  CircleHelpIcon,
  ClockIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShoppingCartIcon,
  Building2Icon,
  UsersIcon,
} from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { canManageTenantUsers } from "@/lib/tenant-permissions"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Gerência",
    url: "/dashboard/gerencia",
    icon: <Building2Icon />,
  },
  {
    title: "Diretoria",
    url: "/dashboard/diretoria",
    icon: <UsersIcon />,
  },
  {
    title: "Orçamentos",
    url: "/dashboard/orcamentos",
    icon: <FileSpreadsheetIcon />,
  },
  {
    title: "Follow-up",
    url: "/dashboard/followup",
    icon: <ClockIcon />,
  },
  {
    title: "Vendas",
    url: "/dashboard/vendas",
    icon: <ShoppingCartIcon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useAuth()
  const canManageUsers = canManageTenantUsers(session?.tenantRole)

  const user = {
    name: session?.user.name ?? "Usuário",
    email: session?.user.email ?? "",
    avatar: "",
  }

  const navSecondary = [
    ...(canManageUsers
      ? [
          {
            title: "Configurações",
            url: "/dashboard/configuracoes",
            icon: <Settings2Icon />,
          },
        ]
      : []),
    {
      title: "Ajuda",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <BrainCircuitIcon className="size-5!" />
                <span className="text-base font-semibold">Sinapse</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
