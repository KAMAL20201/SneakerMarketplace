import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { ROUTE_NAMES } from "@/constants/enums";
import NotFound from "@/pages/NotFound";

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Wait for both auth session restore and admin status check before deciding
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={ROUTE_NAMES.LOGIN} replace />;
  }

  // Non-admin users see 404 (don't reveal that an admin area exists)
  if (!isAdmin) {
    return <NotFound />;
  }

  // If user is authenticated and is an admin, they already completed OTP during
  // sign-in — no need to re-check OTP state on page refresh or navigation.
  return <>{children}</>;
};
