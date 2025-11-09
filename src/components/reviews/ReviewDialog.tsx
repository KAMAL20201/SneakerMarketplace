import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewForm } from "./ReviewForm";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  sellerId: string;
  orderId: string;
  productName: string;
}

export function ReviewDialog({
  open,
  onOpenChange,
  productId,
  sellerId,
  orderId,
  productName,
}: ReviewDialogProps) {
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isCheckingReview, setIsCheckingReview] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      checkExistingReview();
    }
  }, [open, user, productId]);

  const checkExistingReview = async () => {
    if (!user) return;

    try {
      setIsCheckingReview(true);
      const { data, error } = await supabase
        .from("reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("reviewer_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking review:", error);
      }

      setHasReviewed(!!data);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsCheckingReview(false);
    }
  };

  const handleSuccess = () => {
    setHasReviewed(true);
    // Close dialog after a brief delay
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Review: {productName}
          </DialogTitle>
        </DialogHeader>

        {isCheckingReview ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : hasReviewed ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Review Already Submitted
            </h3>
            <p className="text-gray-600 mb-6">
              You have already reviewed this product. Thank you for your
              feedback!
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="glass-button border-0 rounded-xl"
            >
              Close
            </Button>
          </div>
        ) : (
          <ReviewForm
            productId={productId}
            sellerId={sellerId}
            orderId={orderId}
            verifiedPurchase={true}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
