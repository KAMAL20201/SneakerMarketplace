"use client";

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

export function Navbar() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-navbar">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Sidebar trigger */}
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1 glass-button rounded-xl p-2 border-0" />
        </div>

        {/* Center - Logo */}
        <Link to="/" className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <div className="relative">
            {/* Main logo container with glass effect */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg relative overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-50 animate-pulse"></div>

              {/* Logo icon - Sneaker silhouette */}
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-white relative z-10"
                fill="currentColor"
              >
                <path d="M2 18h20l-2-4H10l-1-2H7l-1 2H4l-2 4zm20-6c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v1h14v-1zm-8-4c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1zm4 0c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1z" />
              </svg>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            </div>
          </div>

          {/* Brand text */}
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold gradient-text">SneakHub</h1>
            <p className="text-xs text-gray-600 -mt-1">Premium Marketplace</p>
          </div>
        </Link>

        {/* Right side - Cart and Profile/Auth */}
        <div className="flex items-center gap-3">
          {/* Shopping Cart - only show if authenticated */}
          {user && <CartButton />}

          {/* Authentication Section */}
          {user ? (
            /* Profile Menu for authenticated users */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-2xl glass-button border-0"
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
                className="w-56 glass-card rounded-2xl border-0 mt-2"
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
                {/* <DropdownMenuItem asChild className="rounded-xl mx-1 my-1">
                  <Link to="/profile" className="text-gray-700">
                    Profile
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild className="rounded-xl mx-1 my-1">
                  <Link to="/my-listings" className="text-gray-700">
                    My Listings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/30" />
                <DropdownMenuItem asChild className="rounded-xl mx-1 my-1">
                  <Link to="/settings" className="text-gray-700">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl mx-1 my-1 text-red-600 hover:text-red-700 hover:bg-red-50/80"
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
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
