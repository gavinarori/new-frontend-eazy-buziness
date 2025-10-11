import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
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
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* --- Sidebar (visible on md and up) --- */}
        <aside className="hidden md:flex w-[var(--sidebar-width)] ">
          <AppSidebar />
        </aside>

        {/* --- Main Section --- */}
        <div className="flex flex-1 flex-col min-h-screen">
          <SiteHeader />

          <main className="flex-1 overflow-y-auto h-screen ">
            <div className="container  sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Layout
