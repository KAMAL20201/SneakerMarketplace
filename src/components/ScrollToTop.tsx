import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Let ScrollRestoration handle history positions and section links.
    if (navigationType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollToTop;
