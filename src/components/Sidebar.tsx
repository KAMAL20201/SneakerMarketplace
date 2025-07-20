import {
  Home,
  Search,
  Heart,
  Plus,
  User,
  Settings,
  ShoppingBag,
  TrendingUp,
  Tag,
  MessageCircle,
  Bell,
  CreditCard,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        {
          title: "Saved Items",
          url: "/saved",
          icon: Heart,
        },
        {
          title: "Messages",
          url: "/messages",
          icon: MessageCircle,
        },
        {
          title: "Notifications",
          url: "/notifications",
          icon: Bell,
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
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="glass-button rounded-2xl border-0 hover:bg-white/20 data-[state=open]:bg-white/20"
                >
                  <Avatar className="h-9 w-9 rounded-2xl">
                    <AvatarImage
                      src="/placeholder.svg?height=36&width=36&text=JD"
                      alt="John Doe"
                    />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-gray-800">
                      John Doe
                    </span>
                    <span className="truncate text-xs text-gray-600">
                      john@example.com
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 glass-card rounded-2xl border-0"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild className="rounded-xl mx-1 my-1">
                  <Link to="/profile" className="text-gray-700">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl mx-1 my-1">
                  <Link to="/settings" className="text-gray-700">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl mx-1 my-1 text-gray-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
