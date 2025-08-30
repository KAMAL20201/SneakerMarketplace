import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCart } from "@/contexts/CartContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { Trash2, ShoppingBag } from "lucide-react";

interface CartItemsStepProps {
  onNext: () => void;
}

export const CartItemsStep: React.FC<CartItemsStepProps> = ({ onNext }) => {
  const { items, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="p-6 bg-gray-100/80 rounded-3xl mb-6 backdrop-blur-sm">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          Your cart is empty
        </h3>
        <p className="text-gray-600 mb-8 text-lg">
          Add some items to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto  p-4 bg-gradient-to-b from-white/90 to-white/95 backdrop-blur-sm">
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-hide">
          {items.map((item) => (
            <Card
              key={item.id}
              className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl overflow-hidden shadow-lg"
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100">
                    <ThumbnailImage
                      src={item.image || "/placeholder.svg"}
                      alt={item.productName}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-purple-600 font-bold capitalize">
                          {item.brand}
                        </p>
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1">
                          {item.productName}
                        </h4>
                        <p className="text-xs text-gray-700 font-medium uppercase">
                          Size: {item.size}
                        </p>
                        <ConditionBadge condition={item.condition} />
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-gray-100">
                          {item.sellerName?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs text-gray-600">
                        Sold by {item.sellerName}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{item.price}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer with Continue Button */}
      <div className="fixed bottom-2 w-full border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">
              Total ({items.length} items)
            </p>
            <p className="text-2xl font-bold text-gray-900">₹{totalPrice}</p>
          </div>
        </div>

        <Button
          onClick={onNext}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl py-3 text-lg font-semibold shadow-lg"
        >
          Continue to Shipping
        </Button>
      </div>
    </div>
  );
};
