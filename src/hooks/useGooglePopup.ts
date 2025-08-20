import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

export const useGoogleAuthPopup = () => {
  const signInWithGooglePopup = useCallback(async () => {
    return new Promise((resolve, reject) => {
      // Create popup window
      const popup = window.open(
        "",
        "googleAuth",
        "width=500,height=600,left=" +
          (window.screen.width / 2 - 250) +
          ",top=" +
          (window.screen.height / 2 - 300)
      );
      // Start OAuth flow with popup
      supabase.auth
        .signInWithOAuth({
          provider: "google",
          options: {
            queryParams: {
              prompt: "select_account",
            },
            redirectTo: `${window.location.origin}`,
            skipBrowserRedirect: true, // This prevents main window redirect
          },
        })
        .then(({ data }) => {
          if (data?.url) {
            popup.location.href = data.url;
          }
        });

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Check if auth was successful
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              resolve(session);
            } else {
              reject(new Error("Authentication failed"));
            }
          });
        }
      }, 1000);

      // Listen for messages from popup
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "SUPABASE_AUTH_SUCCESS") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageListener);
          resolve(event.data.session);
        } else if (event.data.type === "SUPABASE_AUTH_ERROR") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageListener);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener("message", messageListener);
    });
  }, []);

  return { signInWithGooglePopup };
};
