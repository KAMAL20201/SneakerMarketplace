import { X, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCart } from "@/contexts/CartContext";
import { PaymentButton } from "@/components/PaymentButton";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import ConditionBadge from "../ui/ConditionBadge";

export function CartSidebar() {
  const { items, toggleCart, clearCart, removeItem, isOpen, totalPrice } =
    useCart();

  if (!isOpen) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
        onClick={toggleCart}
      />

      {/* Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white/95 backdrop-blur-xl border-l border-gray-200/50 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Shopping Cart
                </h2>
                <p className="text-sm text-gray-600">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCart}
              className="h-10 w-10 p-0 rounded-2xl bg-gray-100/80 hover:bg-gray-200/80 border-0"
            >
              <X className="h-5 w-5 text-gray-700" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white/90 to-white/95 backdrop-blur-sm">
            {items.length === 0 ? (
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
                <Button
                  onClick={toggleCart}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl px-8 py-3 text-lg font-semibold shadow-lg"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="p-1 h-auto bg-red-50/80 hover:bg-red-100/80 rounded-xl border-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Seller Info */}
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                {item.sellerName.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-700 font-medium">
                              by {item.sellerName}
                            </span>

                            <ConditionBadge
                              condition={item.condition}
                              // variant="glass"
                              className="text-xs"
                            />
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 font-medium">
                                Quantity: 1
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 text-lg">
                                ₹ {item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Clear Cart Button */}
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={clearCart}
                    className="w-full bg-red-50/80 hover:bg-red-100/80 border-0 rounded-2xl text-red-600 hover:text-red-700 py-3 font-semibold"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer - Checkout */}
          {items.length > 0 && (
            <div className="border-t border-gray-200/50 p-6 space-y-4 bg-white/95 backdrop-blur-sm">
              {/* Total */}
              <div className="flex justify-between items-center py-2">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-gray-900">
                  ₹{totalPrice.toFixed(2)}
                </span>
              </div>

              <Separator className="bg-gray-200/60" />

              {/* Checkout Buttons */}
              <div className="space-y-3">
                <PaymentButton
                  amount={totalPrice}
                  metadata={{
                    cart_items: items.map((item) => item.id).join(","),
                    item_count: items.length.toString(),
                    type: "cart_checkout",
                  }}
                  items={items}
                  className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg text-lg font-bold"
                />

                <Button
                  variant="outline"
                  onClick={toggleCart}
                  className="w-full h-12 bg-gray-100/80 hover:bg-gray-200/80 border border-gray-300/50 rounded-2xl text-gray-800 hover:text-gray-900 font-semibold"
                >
                  Continue Shopping
                </Button>
              </div>

              {/* Security Note */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-600 font-medium">
                    🔒 100% Secure Checkout
                  </p>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Buyer protection • Money-back guarantee • Authenticity
                  verified
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
