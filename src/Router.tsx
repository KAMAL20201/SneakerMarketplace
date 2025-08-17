import { Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import { AdminRoute } from "./components/AdminRoute";
import { PageSkeleton, FormSkeleton } from "./components/ui/skeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ROUTE_NAMES } from "./constants/enums";

// Lazy load all page components with preloading capability
const Home = lazy(() => import("./pages/Home"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const LoginPage = lazy(() => import("./pages/SignIn"));
const SignupPage = lazy(() => import("./pages/SignUp"));
const SellPage = lazy(() => import("./pages/Sell"));
const MyListings = lazy(() => import("./pages/MyListings"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const EditListing = lazy(() => import("./pages/EditListing"));
const Browse = lazy(() => import("./pages/Browse"));
const AdminReview = lazy(() => import("./pages/AdminReview"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Preload functions for critical routes
export const preloadRoutes = {
  home: () => import("./pages/Home"),
  browse: () => import("./pages/Browse"),
  sell: () => import("./pages/Sell"),
  login: () => import("./pages/SignIn"),
  signup: () => import("./pages/SignUp"),
  myListings: () => import("./pages/MyListings"),
  myOrders: () => import("./pages/MyOrders"),
  productDetail: () => import("./pages/ProductDetailPage"),
  editListing: () => import("./pages/EditListing"),
  adminReview: () => import("./pages/AdminReview"),
  paymentMethods: () => import("./pages/PaymentMethods"),
  notFound: () => import("./pages/NotFound"),
};

// Enhanced loading component for better UX
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const Router = () => {
  return (
    <Routes>
      <Route
        path={ROUTE_NAMES.HOME}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Home />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.PRODUCT_DETAIL}
        element={
          <Suspense fallback={<PageLoader />}>
            <ProductDetailPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.LOGIN}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.SIGNUP}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <SignupPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.SELL}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <SellPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.MY_LISTINGS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.MY_ORDERS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.EDIT_LISTING}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <ProtectedRoute>
              <EditListing />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.BROWSE}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Browse />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.ADMIN_REVIEW}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminRoute>
              <AdminReview />
            </AdminRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.PAYMENT_METHODS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ProtectedRoute>
              <PaymentMethods />
            </ProtectedRoute>
          </Suspense>
        }
      />
      {/* Catch-all route for 404 pages */}
      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
};

export default Router;
