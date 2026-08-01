import React, { lazy, Suspense, useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { Navbar } from "./components/Navbar";
import { AppSidebar } from "./components/Sidebar";
import { Toaster } from "sonner";
import { Footer } from "./components/Footer";
import { useIsMobile } from "./hooks/use-mobile";
import ComingSoonWrapper from "./components/ComingSoonWrapper";
import { APP_CONFIG } from "./config/app";

// Lazy load CartSidebar since it's only needed when cart is opened
const CartSidebar = lazy(() =>
  import("./components/Cart/CartSidebar").then((module) => ({
    default: module.CartSidebar,
  }))
);

interface LayoutProps {
  children: React.ReactNode;
}

const BANNER_STORAGE_KEY = "orders-paused-banner-dismissed";

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  const [bannerVisible, setBannerVisible] = useState(() => {
    if (!APP_CONFIG.ORDERS_PAUSED) return false;
    try {
      return sessionStorage.getItem(BANNER_STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handler = () => setBannerVisible(false);
    window.addEventListener("orders-paused-dismissed", handler);
    return () => window.removeEventListener("orders-paused-dismissed", handler);
  }, []);

  return (
    <ComingSoonWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <Navbar />
          <main className={`flex-1 ${bannerVisible ? "pt-[104px] sm:pt-[88px]" : "pt-16"}`}>{children}</main>
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
