import {
  Shield,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Headphones,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BuyerProtection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Buyer Protection
          </h1>
          <p className="text-gray-600 text-lg">
            Your safety and satisfaction are our top priorities
          </p>
          <Badge variant="secondary" className="mt-3">
            Secure Shopping Guaranteed
          </Badge>
        </div>

        {/* Main Protection Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Authenticity Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                Every item listed on The Plug Market undergoes verification to
                ensure authenticity and quality.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Expert verification team</li>
                <li>Quality control checks</li>
                <li>Condition assessment</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Secure Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                Your payment information is protected with industry-standard
                encryption and secure payment processing.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>SSL/TLS encryption</li>
                <li>Secure payment gateways</li>
                <li>Multiple payment options</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              How Buyer Protection Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Shop with Confidence
                </h3>
                <p className="text-sm text-gray-600">
                  Browse verified items from trusted sellers with detailed
                  descriptions and photos
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Secure Transaction
                </h3>
                <p className="text-sm text-gray-600">
                  Make secure payments knowing your money is protected until
                  you're satisfied
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Receive & Verify
                </h3>
                <p className="text-sm text-gray-600">
                  Get your item and verify it matches the description before
                  completing the purchase
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Protected */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">What's Protected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Item Quality
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Item matches description</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Authentic and genuine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Condition as stated</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Delivery Issues
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Item not received</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Damaged during shipping</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Wrong item received</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-8 border-0 shadow-lg bg-yellow-50 border-l-4 border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <div className="space-y-3">
              <p>
                <strong>Development Phase Notice:</strong> This platform is
                currently in development. While we implement comprehensive buyer
                protection features, please note:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Core protection features are being developed</li>
                <li>Payment processing is secure and functional</li>
                <li>Seller verification is in progress</li>
                <li>Full buyer protection will be available at launch</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Headphones className="h-5 w-5 text-blue-600" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you have any questions about buyer protection or encounter
              issues, our support team is here to help:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">Contact Support</p>
              <p>Email: support@theplugmarket.in</p>
              <p>Phone: 1-800-PLUG-IN</p>
              <p className="text-sm text-gray-600 mt-2">
                We're committed to resolving any issues quickly and fairly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
