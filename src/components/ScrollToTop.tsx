import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // POP = back/forward button — let <ScrollRestoration /> handle position
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
