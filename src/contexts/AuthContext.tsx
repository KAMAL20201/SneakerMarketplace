import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { clearAdminOtp } from "../lib/adminOtp";

const AuthContext = createContext<{
  user: User | null | undefined;
  authLoading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: { full_name?: string },
    captchaToken?: string
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  handleSocialLogin: (provider: string) => Promise<any>;
  setOperationAfterLogin: Dispatch<SetStateAction<() => void>>;
  isLoggingIn: boolean;
}>({
  user: null,
  authLoading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  handleSocialLogin: async () => {},
  setOperationAfterLogin: () => {},
  isLoggingIn: false,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null | undefined>(null);
  // Start as true so AdminRoute waits for the session to be restored before
  // making any redirect decisions (avoids redirect to login on page refresh).
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [operationAfterLogin, setOperationAfterLogin] = useState<() => void>(
    () => {}
  );

  useEffect(() => {
    if (user && operationAfterLogin) {
      if (operationAfterLogin) {
        operationAfterLogin();
      }
      setOperationAfterLogin(() => () => {});
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string },
    captchaToken?: string
  ) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        captchaToken,
      },
    });
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    clearAdminOtp();
    return await supabase.auth.signOut();
  };

  const handleSocialLogin = async (provider: string) => {
    if (typeof window === "undefined") return;
    setIsLoggingIn(true);

    try {
      let result;

      switch (provider) {
        case "Google":
          result = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/`,
              queryParams: {
                prompt: "select_account",
              },
            },
          });
          break;
        case "Apple":
          result = await supabase.auth.signInWithOAuth({
            provider: "apple",
            options: {
              redirectTo: `${window.location.origin}/`,
            },
          });
          break;
        case "Facebook":
          result = await supabase.auth.signInWithOAuth({
            provider: "facebook",
            options: {
              redirectTo: `${window.location.origin}/`,
            },
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(`Signing in with ${provider}...`);
      }
    } catch (_err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const value = {
    user,
    authLoading,
    signUp,
    signIn,
    signOut,
    handleSocialLogin,
    setOperationAfterLogin,
    isLoggingIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
