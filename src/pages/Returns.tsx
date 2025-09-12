import { Undo2, PackageX, CheckCircle, Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReturnsPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-4">
            <Undo2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Return Policy
          </h1>
          <p className="text-gray-600 text-lg">How returns work at The Plug Market</p>
          <Badge variant="secondary" className="mt-3">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </Badge>
        </div>

        {/* Overview */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-blue-600" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We want you to shop with confidence. If there is an issue with your order, you can request a
              return in line with the timelines and conditions below. Buyer Protection ensures your money is
              safe until you approve delivery.
            </p>
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Return Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Item not as described or incorrect variant sent</li>
              <li>Damaged or defective on arrival (provide photos)</li>
              <li>Wrong item received</li>
              <li>Item not delivered within the maximum delivery window</li>
            </ul>
            <p className="text-sm text-gray-600">
              Note: Items listed as final sale or explicitly marked non-returnable are not eligible unless damaged or not as described.
            </p>
          </CardContent>
        </Card>

        {/* Timelines */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-orange-600" />
              Timelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <ul className="space-y-2 text-sm">
              <li>• Request return within 24 hours of delivery</li>
              <li>• Return label issued after approval</li>
              <li>• Ship item back within 7 days of approval</li>
              <li>• Refund processed 3–5 business days after verification</li>
            </ul>
          </CardContent>
        </Card>

        {/* How to start a return */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PackageX className="h-5 w-5 text-red-600" />
              How to Start a Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
              <li>Contact support at support@theplugmarket.in with your order ID and reason</li>
              <li>Attach clear photos (damaged item/packaging or mismatch proof)</li>
              <li>Wait for return approval and label</li>
              <li>Pack securely and ship within 7 days using the provided label</li>
            </ol>
          </CardContent>
        </Card>

        {/* Condition & packaging */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Condition & Packaging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Include all original accessories, tags, and packaging</li>
              <li>Use protective materials; mark fragile items appropriately</li>
              <li>Items returned used or altered may be rejected</li>
            </ul>
            <p className="text-sm text-gray-600">Questions? Email support@theplugmarket.in or call +91-78885-27970.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

