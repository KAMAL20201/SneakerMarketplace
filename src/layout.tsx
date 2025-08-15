import React, { lazy, Suspense } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { Navbar } from "./components/Navbar";
import { AppSidebar } from "./components/Sidebar";
import { Toaster } from "sonner";
import { Footer } from "./components/Footer";

// Lazy load CartSidebar since it's only needed when cart is opened
const CartSidebar = lazy(() =>
  import("./components/Cart/CartSidebar").then((module) => ({
    default: module.CartSidebar,
  }))
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </SidebarInset>
      <Suspense fallback={null}>
        <CartSidebar />
      </Suspense>
      <Toaster />
    </SidebarProvider>
  );
};

export default Layout;
