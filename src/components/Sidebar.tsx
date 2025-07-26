import {
  Home,
  Search,
  Plus,
  User,
  Settings,
  ShoppingBag,
  TrendingUp,
  Tag,
  CreditCard,
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
} from "@/components/ui/sidebar";
import { Link } from "react-router";

const data = {
  navMain: [
    {
      title: "Marketplace",
      items: [
        {
          title: "Home",
          url: "/",
          icon: Home,
        },
        {
          title: "Browse",
          url: "/browse",
          icon: Search,
        },
        {
          title: "Trending",
          url: "/trending",
          icon: TrendingUp,
        },
        {
          title: "Categories",
          url: "/categories",
          icon: Tag,
        },
      ],
    },
    {
      title: "My Account",
      items: [
        {
          title: "Sell Sneakers",
          url: "/sell",
          icon: Plus,
        },
        {
          title: "My Listings",
          url: "/my-listings",
          icon: ShoppingBag,
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
        },
        {
          title: "Payment Methods",
          url: "/payment",
          icon: CreditCard,
        },
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
        },
      ],
    },
  ],
};

export function AppSidebar() {
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
              <Link to="/">
                <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white shadow-lg">
                  <span className="text-lg font-bold">S</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-800">
                    SneakHub
                  </span>
                  <span className="truncate text-xs text-gray-600">
                    Marketplace
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
                      className="glass-button rounded-xl border-0 mx-1 my-0.5 hover:bg-white/20"
                    >
                      <Link to={item.url} className="text-gray-700">
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
