import { Truck, Package, Clock, Shield, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-4">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Shipping Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Everything you need to know about shipping and delivery
          </p>
          <Badge variant="secondary" className="mt-3">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Badge>
        </div>

        {/* Shipping Overview */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-blue-600" />
              Shipping Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              At The Plug Market, we understand that getting your sneakers and
              streetwear quickly and safely is important. Our shipping policy is
              designed to ensure your items arrive in perfect condition.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Who Ships Items?
                </h3>
                <p className="text-blue-700 text-sm">
                  We handle all shipping directly. Every order is carefully
                  packed and shipped with secure payment processing.
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  Shipping Protection
                </h3>
                <p className="text-green-700 text-sm">
                  All items are securely packaged and shipped with tracking
                  so you can follow your order every step of the way.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Process */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-5 w-5 text-green-600" />
              How Shipping Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              We ship all orders from our warehouse. Delivery times depend
              on the shipping method chosen and your destination.
              Here's how the process works:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">
                  Standard Shipping
                </h3>
                <p className="text-gray-700 text-sm">
                  • We ship via trusted carriers
                  <br />
                  • Delivery time varies by location and carrier
                  <br />• Tracking information provided for every order
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Important Note
                </h3>
                <p className="text-yellow-700 text-sm">
                  Delivery times may vary based on your location and the
                  shipping carrier. Check individual listings for estimated
                  delivery times.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Expectations */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-orange-600" />
              Delivery Expectations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Delivery Timelines
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    • <strong>Minimum delivery time:</strong> 2-3 business days
                  </li>
                  <li>
                    • <strong>Maximum delivery time:</strong> 18-21 business
                    days
                  </li>
                  <li>• Orders are typically shipped within 1-3 business days</li>
                  <li>
                    • Delivery time depends on your location
                  </li>
                  <li>• Shipping method impacts delivery speed</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Communication
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Tracking information provided for every order</li>
                  <li>• Check listing details for estimated delivery times</li>
                  <li>• Contact us for any shipping questions</li>
                </ul>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Pro Tip</h3>
              <p className="text-blue-700 text-sm">
                Check the shipping notes in each listing for estimated
                delivery times specific to your location.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Requirements */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-red-600" />
              Shipping Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Our Shipping Standards
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                  <li>Items are packaged securely with appropriate materials</li>
                  <li>
                    Tracking information provided within 24 hours of shipping
                  </li>
                  <li>Orders shipped within 1-3 business days of payment confirmation</li>
                  <li>
                    We use reliable shipping carriers (Blue Dart, DTDC, etc.)
                  </li>
                  <li>Every item is verified to match its listing description</li>
                  <li>We communicate any shipping delays proactively</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Packaging Standards
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                  <li>Use sturdy boxes appropriate for item size</li>
                  <li>Include protective padding (bubble wrap, foam)</li>
                  <li>Seal packages securely with quality tape</li>
                  <li>Include return address and buyer information</li>
                  <li>Mark fragile items appropriately</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking and Updates */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-purple-600" />
              Tracking & Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              We provide real-time tracking updates so you always know where
              your package is:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Order Confirmed
                </h3>
                <p className="text-sm text-blue-700">
                  Payment processed and seller notified
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Shipped</h3>
                <p className="text-sm text-green-700">
                  Package dispatched with tracking number
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">
                  Delivered
                </h3>
                <p className="text-sm text-purple-700">
                  Package delivered to your doorstep
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-green-600" />
              Pricing & Service Charges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Our transparent pricing structure ensures you know exactly what
              you're paying for:
            </p>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  No Hidden Fees
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700 ml-4">
                  <li>Pay only the listed price for items</li>
                  <li>No additional platform fees</li>
                  <li>Secure payment processing at no extra cost</li>
                  <li>Shipping included in the listed price</li>
                </ul>
              </div>
            </div>
            {/* [MARKETPLACE REMOVED] "For Sellers" fee structure - only admin sells
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">For Sellers</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Transparent Fee Structure
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 ml-4">
                  <li>Platform fee: 0.5% of sale price</li>
                  <li>Payment gateway charges: 2% of sale price</li>
                  <li>Total deduction: 2.5% of sale price</li>
                  <li>You receive: 97.5% of listed price</li>
                </ul>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Example Calculation
              </h3>
              <p className="text-yellow-700 text-sm">
                If you list an item for ₹10,000: You'll receive ₹9,750 after all
                fees. This includes payment processing and platform maintenance
                costs.
              </p>
            </div>
            */}
          </CardContent>
        </Card>

        {/* Lost or Damaged Items */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Lost or Damaged Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              If your item is lost or damaged during shipping:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Contact us immediately within 48 hours of delivery</li>
              <li>Provide photos of damaged packaging and items</li>
              <li>We'll work with the shipping carrier to resolve the issue</li>
              <li>Full refund or replacement will be provided</li>
              <li>Insurance claims will be processed on your behalf</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Shipping Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you have questions about shipping or need assistance with your
              order:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">The Plug Market Shipping Team</p>
              <p>Email: support@theplugmarket.in</p>
              <p>Phone: +91-78885-27970</p>
              <p className="text-sm text-gray-600 mt-2">
                Available 24/7 for shipping-related inquiries
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
