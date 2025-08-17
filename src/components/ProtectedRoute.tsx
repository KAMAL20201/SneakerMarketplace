import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    toast.error("You must be logged in to access this page", {
      duration: 3000,
    });
    return <Navigate to={ROUTE_NAMES.LOGIN} />;
  }

  // If user is not authenticated, requireAuth will redirect to sign-in
  // and we show the fallback component (or nothing)
  return <>{children}</>;
};
