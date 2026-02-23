import { useEffect } from "react";
import { useLocation } from "react-router";

const BROWSE_STATE_KEY = "browse_page_state";

const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  useEffect(() => {
    // For the browse page, let it handle its own scroll restoration on back navigation
    if (pathname === "/browse") {
      try {
        const saved = sessionStorage.getItem(BROWSE_STATE_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.locationKey === key && state.listings?.length > 0) {
            return; // Browse will restore its own scroll position
          }
        }
      } catch {}
    }

    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;
