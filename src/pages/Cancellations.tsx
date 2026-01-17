import {
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CancellationsRefunds() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full mb-4">
            <RefreshCw className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Cancellations & Refunds
          </h1>
          <p className="text-gray-600 text-lg">
            Our comprehensive refund and cancellation policy
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

        {/* Overview */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Policy Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              At The Plug Market, we want you to be completely satisfied with
              your purchase. Our cancellation and refund policy is designed to
              protect both buyers and sellers while ensuring a fair marketplace
              experience.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                Buyer Protection Guarantee
              </h3>
              <p className="text-green-700 text-sm">
                You have 24 hours after delivery to inspect your item and
                approve the purchase. If you're not satisfied, you can request a
                full refund.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <XCircle className="h-5 w-5 text-red-600" />
              Cancellation Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Before Shipping
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                  <li>Full refund within 24 hours of order placement</li>
                  <li>No cancellation fees for orders not yet shipped</li>
                  <li>Instant refund to original payment method</li>
                  <li>Seller is notified of cancellation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  After Shipping
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                  <li>Cancellation not possible once item is shipped</li>
                  <li>Use our return process instead</li>
                  <li>Contact seller directly for special circumstances</li>
                  <li>We can help facilitate communication</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Policy */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Refund Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900">
                  Eligible for Full Refund
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4 mt-2">
                  <li>Item not as described in listing</li>
                  <li>Item damaged during shipping</li>
                  <li>Wrong item received</li>
                  <li>Item not received within expected timeframe</li>
                  <li>Authenticity concerns (verified by our team)</li>
                </ul>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-gray-900">Partial Refund</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4 mt-2">
                  <li>Minor damage not affecting functionality</li>
                  <li>Item differs slightly from description</li>
                  <li>Packaging issues only</li>
                </ul>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-semibold text-gray-900">
                  Not Eligible for Refund
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4 mt-2">
                  <li>Changed mind after 24-hour approval period</li>
                  <li>Item damaged by buyer after delivery</li>
                  <li>Custom or personalized items</li>
                  <li>Digital items or services</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Process */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-purple-600" />
              Refund Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  1
                </div>
                <h3 className="font-semibold text-blue-800 mb-1 text-sm">
                  Request Refund
                </h3>
                <p className="text-xs text-blue-700">
                  Submit request within 24 hours of delivery
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  2
                </div>
                <h3 className="font-semibold text-green-800 mb-1 text-sm">
                  Review Process
                </h3>
                <p className="text-xs text-green-700">
                  Our team reviews your request within 24 hours
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  3
                </div>
                <h3 className="font-semibold text-purple-800 mb-1 text-sm">
                  Return Item
                </h3>
                <p className="text-xs text-purple-700">
                  Ship item back using provided label
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  4
                </div>
                <h3 className="font-semibold text-orange-800 mb-1 text-sm">
                  Refund Processed
                </h3>
                <p className="text-xs text-orange-700">
                  Refund issued within 3-5 business days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeframes */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Refund Timeframes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Processing Times
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Refund request review: 24 hours</li>
                  <li>• Return shipping: 3-7 business days</li>
                  <li>• Item verification: 1-2 business days</li>
                  <li>• Refund processing: 3-5 business days</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Payment Methods
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• UPI: 1-2 business days</li>
                  <li>• Credit/Debit Cards: 3-5 business days</li>
                  <li>• Bank Transfer: 5-7 business days</li>
                  <li>• WhatsApp Payment: 1-3 business days</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Shipping */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Return Shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Free Return Shipping
                </h3>
                <p className="text-blue-700 text-sm">
                  We provide prepaid return labels for all approved refunds. No
                  cost to you for returning items.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">
                  Return Requirements
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                  <li>Use provided return shipping label</li>
                  <li>Package item securely in original packaging</li>
                  <li>Include all original accessories and documentation</li>
                  <li>Ship within 7 days of approval</li>
                  <li>Keep tracking information for your records</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Refund Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you need help with a refund or have questions about our policy:
            </p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-semibold">The Plug Market Refund Team</p>
              <p>Email: support@theplugmarket.in</p>
              <p>Phone: +91-78885-27970</p>
              <p className="text-sm text-gray-600 mt-2">
                Available 24/7 for refund-related inquiries
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
