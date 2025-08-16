import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage, CardImage } from "@/components/ui/OptimizedImage";

interface ProductCardProps {
  product: {
    product_id: string;
    title: string;
    brand: string;
    price: number;
    originalPrice?: number;
    condition: string;
    size_value: string;
    image_url: string;
  };
  variant?: "horizontal" | "vertical";
}

const ProductCard = ({ product, variant = "horizontal" }: ProductCardProps) => {
  if (variant === "vertical") {
    return (
      <Link to={`/product/${product.product_id}`}>
        <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <CardImage
                src={product.image_url || "/placeholder.svg"}
                alt={product.title}
                aspectRatio="aspect-[4/3]"
                className="w-full sm:h-48 h-36"
              />
  
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-semibold capitalize">
                    {product.brand}
                  </p>
                  <h3 className="font-bold text-gray-800 text-sm capitalize line-clamp-2">
                    {product.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="glass-button border-0 text-gray-700 text-xs rounded-xl capitalize">
                  {product.condition}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 text-lg">
                    ₹ {product.price}
                  </span>
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ₹ {product.originalPrice}
                      </span>
                    )}
                </div>
                <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
                  {product.size_value}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Horizontal variant (default)
  return (
    <Link to={`/product/${product.product_id}`}>
      <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="flex p-4 gap-2">
            <div className="relative w-28 h-28 flex-shrink-0">
              <ProductImage
                src={product.image_url || "/placeholder.svg"}
                alt={product.title}
                className="w-full h-full"
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-purple-600 font-semibold capitalize">
                    {product.brand}
                  </p>
                  <h3 className="font-bold text-gray-800 capitalize">
                    {product.title}
                  </h3>
                </div>
         
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="glass-button border-0 text-gray-700 text-xs rounded-xl ml-auto capitalize">
                  {product.condition}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 text-lg">
                    ₹ {product.price}
                  </span>
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ₹ {product.originalPrice}
                      </span>
                    )}
                </div>
                <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
                  {product.size_value}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
