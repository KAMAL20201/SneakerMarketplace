import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Edit,
  Trash2,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CardImage } from "@/components/ui/OptimizedImage";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  brand: string;
  size_value: string;
  condition: string;
  image_url: string;
  created_at: string;
  status: "active" | "sold" | "pending";
  views: number;
}

const MyListings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  console.log("kamal", listings);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const itemsPerPage = 6;

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user, currentPage]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      // Get total count for pagination
      const { count } = await supabase
        .from("listings_with_images")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Get paginated listings
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("user_id", user?.id)
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      setDeletingId(listingId);

      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Listing deleted successfully");
      fetchListings(); // Refresh the list
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-0 rounded-xl px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Live
          </Badge>
        );
      case "under_review":
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-0 rounded-xl px-3 py-1">
            <FileSearch className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-0 rounded-xl px-3 py-1">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Changes
          </Badge>
        );
      case "sold":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-0 rounded-xl px-3 py-1">
            <Package className="h-3 w-3 mr-1" />
            Sold
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-0 rounded-xl px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your listings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                My Listings
              </h1>
              <p className="text-gray-600 mb-2">Manage your item listings</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-700 text-xs font-medium">
                    Under Review
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 text-xs font-medium">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  <span className="text-red-700 text-xs font-medium">
                    Needs Changes
                  </span>
                </div>
              </div>
            </div>
            <Button
              asChild
              className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30 px-6 py-3"
            >
              <Link to="/sell">
                <Plus className="h-5 w-5 mr-2" />
                Add New Listing
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="glass-card border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Listings</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {listings.length}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Active Listings
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {listings.filter((l) => l.status === "active").length}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {listings.reduce(
                        (sum, listing) => sum + (listing.views || 0),
                        0
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No Listings Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start selling your items by creating your first listing
              </p>
              <Button
                asChild
                className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
              >
                <Link to="/sell">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Listing
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group"
                >
                  <CardContent className="p-0">
                    {/* Image Section */}
                    <div className="relative h-48 overflow-hidden">
                      <CardImage
                        src={listing.image_url || "/placeholder.svg"}
                        alt={listing.title}
                        aspectRatio="aspect-[4/3]"
                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 z-10">
                        {getStatusBadge(listing.status)}
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2 z-10">
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-8 w-8 p-0 glass-button border-0 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30"
                        >
                          <Link to={`/product/${listing.id}`}>
                            <Eye className="h-4 w-4 text-white" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-purple-600 font-semibold capitalize mb-1">
                            {listing.brand}
                          </p>
                          <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">
                            {listing.title}
                          </h3>
                        </div>
                      </div>

                      {/* Price and Size */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-lg">
                            ₹{listing.price.toLocaleString()}
                          </span>
                        </div>
                        {listing.size_value && (
                          <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                            {listing.size_value}
                          </Badge>
                        )}
                      </div>

                      {/* Condition and Date */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs capitalize">
                          {listing.condition}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(listing.created_at)}
                        </div>
                      </div>

                      {/* Views */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Eye className="h-3 w-3" />
                          {listing.views || 0} views
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="flex-1 glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30"
                        >
                          <Link to={`/edit-listing/${listing.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 glass-button border-0 rounded-xl text-red-600 hover:bg-red-50/80 hover:text-red-700"
                              disabled={deletingId === listing.id}
                            >
                              {deletingId === listing.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white border border-gray-200 rounded-2xl shadow-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-gray-800">
                                Delete Listing
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600">
                                Are you sure you want to delete "{listing.title}
                                "? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0 rounded-xl">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(listing.id)}
                                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 rounded-xl"
                              >
                                Delete Listing
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-xl ${
                          currentPage === page
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                            : "glass-button border-0 text-gray-700 hover:bg-white/30"
                        }`}
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyListings;
