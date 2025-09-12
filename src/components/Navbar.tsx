import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router";
import { CartButton } from "./Cart/CartButton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { preloadRoutes } from "@/Router";
import { ROUTE_NAMES } from "@/constants/enums";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const handleLogout = () => {
    signOut();
    toast.success("Logged out successfully");
  };

  // Preload route on hover for better performance
  const handleRoutePreload = (routeKey: keyof typeof preloadRoutes) => {
    preloadRoutes[routeKey]();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full glass-navbar">
      <div className=" flex h-16 items-center justify-between px-4">
        {/* Left side - Sidebar trigger */}
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1 glass-button rounded-xl p-2 border-0" />
        </div>

        {/* Center - Logo */}
        <Link
          to={ROUTE_NAMES.HOME}
          className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2"
          onMouseEnter={() => handleRoutePreload("home")}
        >
          <div className="relative">
            {/* Main logo container with glass effect */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg relative overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-50 animate-pulse"></div>

              {/* Logo icon - Electric plug representing "The Plug" */}
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-white relative z-10"
                fill="currentColor"
              >
                <path d="M16.5 3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V3zM11 3c0-.83-.67-1.5-1.5-1.5S8 2.17 8 3v4c0 .83.67 1.5 1.5 1.5S11 7.83 11 7V3zM6 8.5C6 7.12 7.12 6 8.5 6h7C16.88 6 18 7.12 18 8.5v2c0 .28-.22.5-.5.5h-1v2c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2h-1c-.28 0-.5-.22-.5-.5v-2zm6 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-1.5-.67-1.5-1.5-.67-1.5-1.5-1.5S12 18.17 12 19z" />
              </svg>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            </div>
          </div>

          {/* Brand text */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold gradient-text">
                The Plug Market
              </h1>
            </div>
          </div>
        </Link>

        {/* Right side - Cart and Profile/Auth */}
        <div className="flex items-center gap-3">
          {/* Shopping Cart - only show if authenticated */}
          <CartButton />

          {/* Notifications - only show if authenticated */}
          {/* {user && <NotificationBell />} */}

          {/* Authentication Section */}
          {user ? (
            /* Profile Menu for authenticated users */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full  border-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={
                        user?.user_metadata?.avatar_url || "/placeholder.svg"
                      }
                      alt={user?.user_metadata?.full_name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl">
                      {user?.user_metadata?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56  rounded-2xl border-0 mt-2"
                align="end"
                forceMount
              >
                <div className="flex items-center justify-start gap-2 p-3">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-gray-800">
                      {user?.user_metadata?.full_name}
                    </p>
                    <p className="w-[200px] truncate text-sm text-gray-600">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/30" />
                <DropdownMenuItem
                  asChild
                  className="rounded-xl mx-1 my-1 cursor-pointer"
                >
                  <Link
                    to={ROUTE_NAMES.MY_LISTINGS}
                    className="text-gray-700"
                    onMouseEnter={() => handleRoutePreload("myListings")}
                  >
                    My Listings
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl mx-1 my-1 cursor-pointer"
                  >
                    <Link
                      to={ROUTE_NAMES.ADMIN_REVIEW}
                      className="text-purple-700 font-medium"
                      onMouseEnter={() => handleRoutePreload("adminReview")}
                    >
                      🔍 Admin Review
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-white/30" />
                {/* <DropdownMenuItem
                  asChild
                  className="rounded-xl mx-1 my-1 cursor-pointer"
                >
                  <Link to={ROUTE_NAMES.SETTINGS} className="text-gray-700">
                    Settings
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  className="rounded-xl mx-1 my-1 text-red-600 hover:text-red-700 hover:bg-red-50/80 cursor-pointer"
                  onClick={handleLogout}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Login/Signup buttons for non-authenticated users */
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-xl shadow-lg"
              >
                <Link
                  to={ROUTE_NAMES.LOGIN}
                  onMouseEnter={() => handleRoutePreload("login")}
                >
                  Log In
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
