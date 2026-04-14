import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { ROUTE_NAMES } from "@/constants/enums";
import { isAdminOtpVerified } from "@/lib/adminOtp";
import NotFound from "@/pages/NotFound";

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Show loading while checking admin status
  if (adminLoading) {
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

  // Admin but OTP not yet verified — send back to login to complete the OTP step
  if (!isAdminOtpVerified(user.id)) {
    return <Navigate to={ROUTE_NAMES.LOGIN} replace />;
  }

  return <>{children}</>;
};
