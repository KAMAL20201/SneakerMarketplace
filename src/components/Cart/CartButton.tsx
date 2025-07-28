import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";

export function CartButton() {
  const { toggleCart, items } = useCart();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative glass-button rounded-xl border-0 p-2"
      onClick={toggleCart}
    >
      <ShoppingCart className="h-5 w-5" />
      {items.length > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-gradient-to-r from-blue-500 to-purple-500 border-0 animate-pulse">
          {items.length > 99 ? "99+" : items.length}
        </Badge>
      )}
    </Button>
  );
}
