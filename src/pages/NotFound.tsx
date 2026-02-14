import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            {/* 404 Number */}
            <div className="mb-6">
              <h1 className="text-8xl font-bold text-gray-200 select-none">
                404
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Page Not Found
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Oops! The page you're looking for doesn't exist. It might have
                been moved, deleted, or you entered the wrong URL.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-12"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>

              <Link to={ROUTE_NAMES.HOME} className="block">
                <Button className="w-full flex items-center justify-center gap-2 h-12">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>

              <Link to={ROUTE_NAMES.BROWSE} className="block">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 h-12 text-gray-600 hover:text-gray-900"
                >
                  <Search className="h-4 w-4" />
                  Browse Products
                </Button>
              </Link>
            </div>

            {/* Helpful Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Popular sections:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  to={ROUTE_NAMES.BROWSE}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Browse Products
                </Link>
                <span className="text-gray-300">•</span>
                <Link
                  to={ROUTE_NAMES.MY_ORDERS}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  My Orders
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
