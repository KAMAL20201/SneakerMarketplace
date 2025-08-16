import { useState, useEffect } from "react";
import {
  Check,
  X,
  Calendar,
  User,
  Package,
  Tag,
  DollarSign,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CardImage } from "@/components/ui/OptimizedImage";

interface Listing {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  condition: string;
  description: string;
  status: string;
  created_at: string;
  image_url: string;
  size_value?: string;
  seller_id: string;
  sellers?: {
    display_name: string;
    phone: string;
  };
}

export default function AdminReview() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings_with_images")
        .select(
          `
          *,
          sellers (
            display_name,
            phone
          )
        `
        )
        .eq("status", "under_review")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("product_listings")
        .update({
          status: "active",
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment || "Approved",
        })
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Listing approved successfully!");
      setReviewComment("");
      fetchPendingListings();
    } catch (error) {
      console.error("Error approving listing:", error);
      toast.error("Failed to approve listing");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (listingId: string) => {
    if (!reviewComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("product_listings")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment,
        })
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Listing rejected with feedback");
      setReviewComment("");
      fetchPendingListings();
    } catch (error) {
      console.error("Error rejecting listing:", error);
      toast.error("Failed to reject listing");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listings for review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl">
              <FileSearch className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Admin Review Panel
              </h1>
              <p className="text-gray-600">
                Review and approve pending listings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge className="bg-yellow-100 text-yellow-800 border-0 px-4 py-2">
              <FileSearch className="h-4 w-4 mr-2" />
              {listings.length} Pending Reviews
            </Badge>
            <Button
              onClick={fetchPendingListings}
              variant="outline"
              className="glass-button border-0 rounded-xl"
            >
              Refresh
            </Button>
          </div>
        </div>

        {listings.length === 0 ? (
          <Card className="glass-card border-0 rounded-3xl">
            <CardContent className="text-center py-12">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600">
                No listings pending review at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className="glass-card border-0 rounded-3xl overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-800 mb-2">
                        {listing.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          <Tag className="h-3 w-3 mr-1" />
                          {listing.category}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-800 border-0">
                          <Package className="h-3 w-3 mr-1" />
                          {listing.brand}
                        </Badge>
                        {listing.size_value && (
                          <Badge className="bg-gray-100 text-gray-800 border-0">
                            Size: {listing.size_value}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 border-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(listing.created_at)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Image */}
                  <div className="relative h-48 rounded-2xl overflow-hidden bg-gray-100">
                    <CardImage
                      src={listing.image_url || "/placeholder.svg"}
                      alt={listing.title}
                      aspectRatio="aspect-[4/3]"
                      className="w-full h-full"
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-lg text-gray-800">
                          ₹{listing.price}
                        </span>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-0">
                        {listing.condition}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>
                        {listing.sellers?.display_name || "Unknown Seller"}
                      </span>
                      {listing.sellers?.phone && (
                        <span className="text-gray-400">
                          • {listing.sellers.phone}
                        </span>
                      )}
                    </div>

                    {listing.description && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {listing.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
                          onClick={() => setSelectedListing(listing)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Listing</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve "
                            {selectedListing?.title}"? This will make it visible
                            to all users.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4">
                          <Textarea
                            placeholder="Optional approval note..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              selectedListing &&
                              handleApprove(selectedListing.id)
                            }
                            disabled={actionLoading}
                            className="bg-green-500 hover:bg-green-600 rounded-xl"
                          >
                            {actionLoading ? "Approving..." : "Approve"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1 rounded-xl"
                          onClick={() => setSelectedListing(listing)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Listing</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide a reason for rejecting "
                            {selectedListing?.title}". This feedback will be
                            sent to the seller.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4">
                          <Textarea
                            placeholder="Reason for rejection (required)..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            className="rounded-xl"
                            required
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              selectedListing &&
                              handleReject(selectedListing.id)
                            }
                            disabled={actionLoading || !reviewComment.trim()}
                            className="bg-red-500 hover:bg-red-600 rounded-xl"
                          >
                            {actionLoading ? "Rejecting..." : "Reject"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
