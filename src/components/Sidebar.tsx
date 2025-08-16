import {
  Home,
  Search,
  Plus,
  User,
  Settings,
  ShoppingBag,
  CreditCard,
  Package,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "react-router";
import { preloadRoutes } from "@/Router";

const data = {
  navMain: [
    {
      title: "Marketplace",
      items: [
        {
          title: "Home",
          url: "/",
          icon: Home,
          preloadKey: "home" as keyof typeof preloadRoutes,
        },
        {
          title: "Browse",
          url: "/browse",
          icon: Search,
          preloadKey: "browse" as keyof typeof preloadRoutes,
        },
      ],
    },
    {
      title: "My Account",
      items: [
        {
          title: "Sell Items",
          url: "/sell",
          icon: Plus,
          preloadKey: "sell" as keyof typeof preloadRoutes,
        },
        {
          title: "My Listings",
          url: "/my-listings",
          icon: ShoppingBag,
          preloadKey: "myListings" as keyof typeof preloadRoutes,
        },
        {
          title: "My Orders",
          url: "/my-orders",
          icon: Package,
          preloadKey: "myOrders" as keyof typeof preloadRoutes,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          title: "Profile",
          url: "/profile",
          icon: User,
          preloadKey: null, // No preload for this route
        },
        {
          title: "Payment Methods",
          url: "/payment-methods",
          icon: CreditCard,
          preloadKey: "paymentMethods" as keyof typeof preloadRoutes,
        },
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
          preloadKey: null, // No preload for this route
        },
      ],
    },
  ],
};

export function AppSidebar() {
  const { toggleSidebar } = useSidebar();

  // Preload route on hover for better performance
  const handleRoutePreload = (
    preloadKey: keyof typeof preloadRoutes | null
  ) => {
    if (preloadKey) {
      preloadRoutes[preloadKey]();
    }
  };

  return (
    <Sidebar variant="inset" className="border-0">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="glass-button rounded-2xl border-0 hover:bg-white/20"
            >
              <Link to="/" onMouseEnter={() => handleRoutePreload("home")}>
                <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white shadow-lg">
                  <span className="text-lg font-bold">⚡</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-800">
                    The Plug Market
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-gray-700 font-semibold px-3">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className=" rounded-xl border-0 mx-1 my-0.5 hover:bg-white/20"
                      onClick={() => {
                        //close the sidebar
                        toggleSidebar();
                      }}
                    >
                      <Link
                        to={item.url}
                        className="text-gray-700"
                        onMouseEnter={() => handleRoutePreload(item.preloadKey)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
