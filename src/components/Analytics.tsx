import { useEffect } from "react";
import { useLocation } from "react-router";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

/**
 * Analytics — fires a GA4 page_view event on every client-side route change.
 * Clarity tracks sessions automatically; no extra calls needed.
 * Mount this once, directly inside <BrowserRouter>.
 */
const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
};

export default Analytics;
