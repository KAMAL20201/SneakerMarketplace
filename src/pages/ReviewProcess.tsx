import {
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReviewProcess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Review Process
          </h1>
          <p className="text-gray-600 text-lg">
            How we ensure quality and accurate description of every item
          </p>
          <Badge variant="secondary" className="mt-3">
            Quality Assured
          </Badge>
        </div>

        {/* Overview */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Our Review Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p className="text-center text-lg">
              Every item listed on The Plug Market goes through our
              comprehensive review process to ensure quality and
              accurate representation.
            </p>
            <p className="text-center">
              Our expert team examines each listing to maintain the highest
              standards for our community of buyers and sellers.
            </p>
          </CardContent>
        </Card>

        {/* Review Steps */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Review Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    Initial Submission
                  </h3>
                  <p className="text-gray-700">
                    Sellers submit items with detailed descriptions, photos, and
                    condition information. Our system automatically checks for
                    completeness and basic requirements.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    Expert Review
                  </h3>
                  <p className="text-gray-700">
                    Our verification team examines photos, descriptions, and
                    pricing to ensure accuracy and quality. We check for
                    red flags and verify item details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    Quality Check
                  </h3>
                  <p className="text-gray-700">
                    Items are assessed for condition accuracy, proper
                    categorization, and compliance with our marketplace
                    standards and policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    Approval & Listing
                  </h3>
                  <p className="text-gray-700">
                    Once approved, items are listed with our quality assurance
                    badge. Rejected items receive detailed feedback for
                    improvement.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Check */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">What We Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Content Quality
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">
                      Clear, accurate descriptions
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">High-quality photos</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Proper categorization</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Fair pricing</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Quality & Safety
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Quality items only</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Accurate descriptions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Policy compliance</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Safe for all users</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Timeline */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-blue-600" />
              Review Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800">
                  Standard Review
                </h4>
                <p className="text-2xl font-bold text-green-600">24-48 hours</p>
                <p className="text-sm text-green-700">Most items</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">Priority Review</h4>
                <p className="text-2xl font-bold text-blue-600">4-8 hours</p>
                <p className="text-sm text-blue-700">Premium sellers</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800">Complex Items</h4>
                <p className="text-2xl font-bold text-orange-600">2-3 days</p>
                <p className="text-sm text-orange-700">High-value items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Phase Notice */}
        <Card className="mb-8 border-0 shadow-lg bg-yellow-50 border-l-4 border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Development Phase Status
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <div className="space-y-3">
              <p>
                <strong>Current Implementation:</strong> Our review process is
                being developed and enhanced. Current features include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>✅ Basic content review system</li>
                <li>✅ Photo quality checks</li>
                <li>🔄 Automated verification in development</li>
                <li>🔄 Expert review team expansion</li>
                <li>🔄 Advanced fraud detection</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-blue-600" />
              Review Team Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              Have questions about our review process or need assistance with
              your listing? Our review team is here to help:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">Contact Review Team</p>
              <p>Email: reviews@theplugmarket.in</p>
              <p>Phone: 1-800-PLUG-IN</p>
              <p className="text-sm text-gray-600 mt-2">
                We typically respond within 24 hours during business days.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
