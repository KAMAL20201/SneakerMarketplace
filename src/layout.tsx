import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { Navbar } from "./components/Navbar";
import { AppSidebar } from "./components/Sidebar";
import { Toaster } from "sonner";
import { Footer } from "./components/Footer";
import { useIsMobile } from "./hooks/use-mobile";
import ComingSoonWrapper from "./components/ComingSoonWrapper";
import { ROUTE_NAMES } from "./constants/enums";

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
  const isMobile = useIsMobile();
  const isDiwaliSale = useLocation().pathname.replace(/\/+$/, "") === ROUTE_NAMES.DIWALI_SALE;

  return () => window.removeEventListener("orders-paused-dismissed", handler);
  }, []);

  return (
    <ComingSoonWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className={isDiwaliSale ? "diwali-storefront" : undefined}>
          <Navbar />
          <main className="flex-1 pt-[var(--store-header-height,108px)]">{children}</main>
          <Footer />
        </SidebarInset>
        <Suspense fallback={null}>
          <CartSidebar />
        </Suspense>
        <Toaster
          position={isMobile ? "bottom-center" : "top-right"}
          offset={{ top: isMobile ? undefined : 60 }}
          richColors
          closeButton
        />
      </SidebarProvider>
    </ComingSoonWrapper>
  );
};

export default Layout;
