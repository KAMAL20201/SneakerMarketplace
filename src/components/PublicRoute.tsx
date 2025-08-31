import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useEffect, useState } from "react";

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (user) {
      toast.info("You are already logged in. Redirecting to homepage...", {
        duration: 2000,
      });
      // Small delay to show the toast message
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // If user is already authenticated, redirect to homepage after delay
  if (shouldRedirect) {
    return <Navigate to={ROUTE_NAMES.HOME} replace />;
  }

  // If user is not authenticated, allow access to public routes
  if (!user) {
    return <>{children}</>;
  }

  // Show loading state while waiting to redirect
  return (
    <div className="min-h-[calc(100dvh-70px)] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="text-sm text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};
