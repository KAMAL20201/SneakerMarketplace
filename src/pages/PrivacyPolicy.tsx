import { Shield, Lock, Eye, Database, Users, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
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
              <Globe className="h-5 w-5 text-blue-600" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The Plug Market ("we," "our," or "us") is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our
              marketplace platform.
            </p>
            <p>
              By using The Plug Market, you agree to the collection and use of
              information in accordance with this policy. If you do not agree
              with our policies and practices, please do not use our service.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5 text-green-600" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Personal Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Name, email address, and phone number</li>
                <li>Billing and shipping addresses</li>
                <li>
                  Payment information (processed securely through our payment
                  partners)
                </li>
                <li>Profile information and preferences</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Usage Information</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Browsing history and search queries</li>
                <li>Transaction history and purchase behavior</li>
                <li>Device information and IP address</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-purple-600" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Service Provision
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Process transactions and payments</li>
                  <li>Facilitate buyer-seller communication</li>
                  <li>Provide customer support</li>
                  <li>Verify user identity and prevent fraud</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Improvement & Marketing
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Improve our platform and services</li>
                  <li>Send relevant updates and offers</li>
                  <li>Analyze usage patterns</li>
                  <li>Personalize your experience</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Sharing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-orange-600" />
              Information Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We do not sell, trade, or rent your personal information to third
              parties. We may share your information only in the following
              circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>
                With trusted service providers who assist in our operations
              </li>
              <li>In connection with a business transfer or merger</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-red-600" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We implement appropriate technical and organizational security
              measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">
                  Technical Measures
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                  <li>SSL/TLS encryption</li>
                  <li>Secure data centers</li>
                  <li>Regular security audits</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">
                  Organizational Measures
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                  <li>Access controls</li>
                  <li>Employee training</li>
                  <li>Incident response plans</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-blue-600" />
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              You have the following rights regarding your personal information:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Access & Control
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to data processing</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Communication</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Opt-out of marketing emails</li>
                  <li>Control cookie preferences</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">The Plug Market</p>
              <p>Email: support@theplugmarket.in</p>
              <p>Phone: +91-78885-27970</p>
              <p>
                Address: #222, Near Ram Mandir, Patiala Gate, Sangrur, Punjab
                148001, India
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>
            This Privacy Policy is effective as of the date listed above and
            will remain in effect except with respect to any changes in its
            provisions in the future.
          </p>
        </div>
      </div>
    </div>
  );
}
