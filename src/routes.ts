import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Public — SEO-critical (will have server loaders)
  index("./pages/Home.tsx"),
  route("product/:id", "./pages/ProductDetailPage.tsx"),
  route("browse", "./pages/Browse.tsx"),
  route("sneakers", "./pages/CategoryBrowse.tsx", { id: "category-sneakers" }),
  route("apparels", "./pages/CategoryBrowse.tsx", { id: "category-apparels" }),
  route("electronics", "./pages/CategoryBrowse.tsx", {
    id: "category-electronics",
  }),
  route("collectibles", "./pages/CategoryBrowse.tsx", {
    id: "category-collectibles",
  }),
  route("new-arrivals", "./pages/NewArrivals.tsx"),
  route("new-drops", "./pages/NewDrops.tsx"),
  route("wishlist", "./pages/Wishlist.tsx"),

  // Static public pages
  route("about", "./pages/AboutUs.tsx"),
  route("contact-us", "./pages/ContactUs.tsx"),
  route("privacy", "./pages/PrivacyPolicy.tsx"),
  route("terms", "./pages/TermsOfService.tsx"),
  route("shipping-policy", "./pages/ShippingPolicy.tsx"),
  route("returns", "./pages/Returns.tsx"),

  // Auth
  route("login", "./pages/SignIn.tsx"),

  // Protected / admin routes (client-side only, no SSR needed)
  route("sell", "./pages/Sell.tsx"),
  route("my-listings", "./pages/MyListings.tsx"),
  route("my-orders", "./pages/MyOrders.tsx"),
  route("my-addresses", "./pages/MyAddresses.tsx"),
  route("edit-listing/:id", "./pages/EditListing.tsx"),
  route("admin/review", "./pages/AdminReview.tsx"),
  route("admin/import", "./pages/AdminImport.tsx"),
  route("admin/banners", "./pages/AdminBanners.tsx"),

  // 404 catch-all
  route("*", "./pages/NotFound.tsx"),
] satisfies RouteConfig;
