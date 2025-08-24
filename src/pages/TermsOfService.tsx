import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Users,
  ShoppingCart,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600 text-lg">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <Badge variant="secondary" className="mt-3">
            Version 1.0
          </Badge>
        </div>

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Scale className="h-5 w-5 text-blue-600" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              These Terms of Service ("Terms") govern your use of The Plug
              Market platform operated by The Plug Market ("Company," "we,"
              "us," or "our"). By accessing or using our service, you agree to
              be bound by these Terms.
            </p>
            <p>
              If you disagree with any part of these terms, then you may not
              access the service. These Terms apply to all visitors, users, and
              others who access or use the service.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The Plug Market is an online marketplace that connects buyers and
              sellers of sneakers, streetwear, collectibles, and related items.
              Our platform facilitates:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">For Buyers</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Browse and purchase authentic items</li>
                  <li>Secure payment processing</li>
                  <li>Buyer protection guarantees</li>
                  <li>Customer support services</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">For Sellers</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>List items for sale</li>
                  <li>Manage inventory and orders</li>
                  <li>Receive secure payments</li>
                  <li>Access to buyer network</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-purple-600" />
              User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Account Creation
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Account Responsibilities
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    You are responsible for all activities under your account
                  </li>
                  <li>Keep your contact information updated</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Maintain appropriate behavior on the platform</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Activities */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <XCircle className="h-5 w-5 text-red-600" />
              Prohibited Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 mb-4">
              You agree not to engage in any of the following activities:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Illegal Activities
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Selling counterfeit or replica items</li>
                  <li>Violating intellectual property rights</li>
                  <li>Engaging in fraud or deception</li>
                  <li>Violating applicable laws or regulations</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Platform Misuse</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Creating multiple accounts to circumvent restrictions</li>
                  <li>Manipulating reviews or ratings</li>
                  <li>Spamming or harassing other users</li>
                  <li>Attempting to gain unauthorized access</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transaction Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Payment & Fees</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>All prices are listed in Indian Rupees (INR)</li>
                  <li>Platform fees apply to completed transactions</li>
                  <li>Payment is processed securely through our partners</li>
                  <li>Refunds are processed according to our return policy</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Shipping & Delivery
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Sellers are responsible for shipping items</li>
                  <li>Delivery times vary by location and shipping method</li>
                  <li>Tracking information must be provided</li>
                  <li>Items must be shipped within specified timeframes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-blue-600" />
              Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The service and its original content, features, and functionality
              are and will remain the exclusive property of The Plug Market and
              its licensors. The service is protected by copyright, trademark,
              and other laws.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">User Content</h4>
              <p className="text-sm">
                By posting content on our platform, you grant us a
                non-exclusive, worldwide, royalty-free license to use,
                reproduce, and distribute your content in connection with our
                service.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimers & Limitations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Disclaimers & Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Service Availability
                </h3>
                <p>
                  We strive to provide uninterrupted service but cannot
                  guarantee 100% uptime. We may temporarily suspend the service
                  for maintenance or updates.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Liability Limitations
                </h3>
                <p>
                  Our liability is limited to the amount you paid for our
                  service. We are not responsible for indirect, incidental, or
                  consequential damages.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Third-Party Services
                </h3>
                <p>
                  We may use third-party services for payment processing,
                  shipping, and other functions. We are not responsible for
                  their actions or policies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We may terminate or suspend your account and access to the service
              immediately, without prior notice, for any reason, including
              breach of these Terms.
            </p>
            <p>
              Upon termination, your right to use the service will cease
              immediately. If you wish to terminate your account, you may simply
              discontinue using the service.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days notice
              prior to any new terms taking effect.
            </p>
            <p>
              What constitutes a material change will be determined at our sole
              discretion. By continuing to access or use our service after any
              revisions become effective, you agree to be bound by the revised
              terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you have any questions about these Terms of Service, please
              contact us:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">The Plug Market</p>
              <p>Email: legal@theplugmarket.in</p>
              <p>Phone: 1-800-PLUG-IN</p>
              <p>Address: [Your Business Address]</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>
            These Terms of Service are effective as of the date listed above and
            will remain in effect until modified or terminated.
          </p>
        </div>
      </div>
    </div>
  );
}
