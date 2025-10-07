import type React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "../app-sidebar"
import { SiteHeader } from "../site-header"

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />

      <SidebarInset>
        <div className="flex h-screen flex-col">
          <SiteHeader />

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
