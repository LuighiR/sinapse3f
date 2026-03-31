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
  LayoutDashboardIcon,
  FileSpreadsheetIcon,
  ShoppingCartIcon,
  ClockIcon,
  Settings2Icon,
  CircleHelpIcon,
  BrainCircuitIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
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

const navSecondary = [
  {
    title: "Configurações",
    url: "#",
    icon: <Settings2Icon />,
  },
  {
    title: "Ajuda",
    url: "#",
    icon: <CircleHelpIcon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useAuth()

  const user = {
    name: session?.user.name ?? "Usuário",
    email: session?.user.email ?? "",
    avatar: "",
  }

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
