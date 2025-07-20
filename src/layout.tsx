import React from "react";
import {
  SidebarProvider,
  SidebarInset,
} from "./components/ui/sidebar";
import { Navbar } from "./components/Navbar";
import { CartSidebar } from "./components/Cart/CartSidebar";
import { AppSidebar } from "./components/Sidebar";
import { Toaster } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex-1">{children}</main>
      </SidebarInset>
      <CartSidebar />
      <Toaster />
    </SidebarProvider>
  );
};

export default Layout;
