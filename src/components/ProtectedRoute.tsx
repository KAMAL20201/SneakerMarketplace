import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { logger } from "@/components/ui/Logger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  route: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  route,
}) => {
  const { user, setOperationAfterLogin } = useAuth();
  const navigate = useNavigate();
  logger.info(`Protected route accessed: ${route}`);
  if (!user) {
    toast.error("You must be logged in to access this page", {
      duration: 3000,
    });
    setOperationAfterLogin(() => () => {
      navigate(route);
    });
    return <Navigate to={ROUTE_NAMES.LOGIN} />;
  }

  // If user is not authenticated, requireAuth will redirect to sign-in
  // and we show the fallback component (or nothing)
  return <>{children}</>;
};
