import { AdminRoute } from "@/components/AdminRoute";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";
import {
  Search,
  Upload,
  ImagePlay,
  BookOpen,
  FileText,
  Tag,
  Zap,
  Flame,
  MessageCircle,
  Star,
  ShoppingBag,
  Activity,
} from "lucide-react";

const ADMIN_SECTIONS = [
  {
    title: "Review Listings",
    description: "Approve or reject submitted product listings",
    url: ROUTE_NAMES.ADMIN_REVIEW,
    icon: Search,
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Import Products",
    description: "Bulk import products from CSV or external sources",
    url: ROUTE_NAMES.ADMIN_IMPORT,
    icon: Upload,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Banners",
    description: "Manage homepage and promotional banners",
    url: ROUTE_NAMES.ADMIN_BANNERS,
    icon: ImagePlay,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Blog",
    description: "Create and manage blog posts",
    url: ROUTE_NAMES.ADMIN_BLOG,
    icon: BookOpen,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Descriptions",
    description: "Edit product description templates",
    url: ROUTE_NAMES.ADMIN_DESCRIPTIONS,
    icon: FileText,
    color: "from-orange-500 to-amber-500",
  },
  {
    title: "Coupons",
    description: "Create and manage discount coupons",
    url: ROUTE_NAMES.ADMIN_COUPONS,
    icon: Tag,
    color: "from-yellow-500 to-orange-500",
  },
  {
    title: "New Drops",
    description: "Manage featured new drop listings",
    url: ROUTE_NAMES.ADMIN_NEW_DROPS,
    icon: Zap,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Hot Deals",
    description: "Select 30%+ off listings to feature in Hot Deals",
    url: ROUTE_NAMES.ADMIN_HOT_DEALS,
    icon: Flame,
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Running Sneakers",
    description: "Choose which sneakers are shown in Running Sneakers page",
    url: ROUTE_NAMES.ADMIN_RUNNING_SNEAKERS,
    icon: Activity,
    color: "from-blue-500 to-indigo-500",
  },
  {
    title: "Instant Ship",
    description: "Mark individual sizes as in-hand instant ship inventory",
    url: ROUTE_NAMES.ADMIN_INSTANT_SHIP,
    icon: Zap,
    color: "from-teal-500 to-cyan-500",
  },
  {
    title: "Messages",
    description: "View and respond to customer messages",
    url: ROUTE_NAMES.ADMIN_MESSAGES,
    icon: MessageCircle,
    color: "from-teal-500 to-green-500",
  },
  {
    title: "Order Emails",
    description: "Send and review order confirmation emails",
    url: ROUTE_NAMES.ADMIN_ORDERS,
    icon: Star,
    color: "from-red-500 to-pink-500",
  },
  {
    title: "My Listings",
    description: "View and manage your active listings",
    url: ROUTE_NAMES.MY_LISTINGS,
    icon: ShoppingBag,
    color: "from-slate-500 to-gray-500",
  },
];

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage all aspects of the marketplace</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.url}
              to={section.url}
              className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4"
            >
              <div
                className={`flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-sm`}
              >
                <section.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                  {section.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}
