import { Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import { AdminRoute } from "./components/AdminRoute";
import { PageSkeleton, FormSkeleton } from "./components/ui/skeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";
import { ROUTE_NAMES } from "./constants/enums";
import ProductDetailSkeleton from "./components/ui/ProductDetailSkeleton";

// Lazy load all page components with preloading capability
const Home = lazy(() => import("./pages/Home"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const LoginPage = lazy(() => import("./pages/SignIn"));
const SignupPage = lazy(() => import("./pages/SignUp"));
const SellPage = lazy(() => import("./pages/Sell"));
const MyListings = lazy(() => import("./pages/MyListings"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const MyAddresses = lazy(() => import("./pages/MyAddresses"));
const EditListing = lazy(() => import("./pages/EditListing"));
const Browse = lazy(() => import("./pages/Browse"));
const AdminReview = lazy(() => import("./pages/AdminReview"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const BuyerProtection = lazy(() => import("./pages/BuyerProtection"));
const SecurePayments = lazy(() => import("./pages/SecurePayments"));
const ReviewProcess = lazy(() => import("./pages/ReviewProcess"));

// Preload functions for critical routes
export const preloadRoutes = {
  home: () => import("./pages/Home"),
  browse: () => import("./pages/Browse"),
  sell: () => import("./pages/Sell"),
  login: () => import("./pages/SignIn"),
  signup: () => import("./pages/SignUp"),
  myListings: () => import("./pages/MyListings"),
  myOrders: () => import("./pages/MyOrders"),
  myAddresses: () => import("./pages/MyAddresses"),
  productDetail: () => import("./pages/ProductDetailPage"),
  editListing: () => import("./pages/EditListing"),
  adminReview: () => import("./pages/AdminReview"),
  paymentMethods: () => import("./pages/PaymentMethods"),
  notFound: () => import("./pages/NotFound"),
  privacyPolicy: () => import("./pages/PrivacyPolicy"),
  termsOfService: () => import("./pages/TermsOfService"),
  aboutUs: () => import("./pages/AboutUs"),
  buyerProtection: () => import("./pages/BuyerProtection"),
  securePayments: () => import("./pages/SecurePayments"),
  reviewProcess: () => import("./pages/ReviewProcess"),
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
          <Suspense fallback={<ProductDetailSkeleton />}>
            <ProductDetailPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.LOGIN}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.SIGNUP}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
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
            <ProtectedRoute route={ROUTE_NAMES.MY_LISTINGS}>
              <MyListings />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.MY_ORDERS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ProtectedRoute route={ROUTE_NAMES.MY_ORDERS}>
              <MyOrders />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.MY_ADDRESSES}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ProtectedRoute route={ROUTE_NAMES.MY_ADDRESSES}>
              <MyAddresses />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.EDIT_LISTING}
        element={
          <Suspense fallback={<FormSkeleton />}>
            <ProtectedRoute route={ROUTE_NAMES.EDIT_LISTING}>
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
            <ProtectedRoute route={ROUTE_NAMES.PAYMENT_METHODS}>
              <PaymentMethods />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.PRIVACY}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <PrivacyPolicy />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.TERMS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <TermsOfService />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.ABOUT}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AboutUs />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.BUYER_PROTECTION}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <BuyerProtection />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.SECURE_PAYMENTS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <SecurePayments />
          </Suspense>
        }
      />
      <Route
        path={ROUTE_NAMES.REVIEW_PROCESS}
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ReviewProcess />
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
