import {
  CreditCard,
  Lock,
  Shield,
  CheckCircle,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SecurePayments() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-600 rounded-full mb-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Secure Payments
          </h1>
          <p className="text-gray-600 text-lg">
            Your financial information is protected with industry-leading
            security
          </p>
          <Badge variant="secondary" className="mt-3">
            PCI DSS Compliant
          </Badge>
        </div>

        {/* Security Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-5 w-5 text-green-600" />
                Encryption & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                All payment data is encrypted using industry-standard SSL/TLS
                encryption to ensure your information remains secure.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>256-bit SSL encryption</li>
                <li>Secure data transmission</li>
                <li>PCI DSS compliance</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-blue-600" />
                Fraud Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                Advanced fraud detection systems monitor transactions to protect
                against unauthorized charges and suspicious activity.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Real-time monitoring</li>
                <li>Fraud detection algorithms</li>
                <li>Secure authentication</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Accepted Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Digital Payments
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded"></div>
                    <span className="font-medium">UPI</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded"></div>
                    <span className="font-medium">Digital Wallets</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded"></div>
                    <span className="font-medium">Net Banking</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Card Payments
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-red-500 rounded"></div>
                    <span className="font-medium">Credit Cards</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded"></div>
                    <span className="font-medium">Debit Cards</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-500 rounded"></div>
                    <span className="font-medium">Prepaid Cards</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              How Secure Payments Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-900">Choose Payment</h3>
                <p className="text-sm text-gray-600">
                  Select your preferred payment method from our secure options
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Secure Processing
                </h3>
                <p className="text-sm text-gray-600">
                  Your payment is processed through encrypted, secure channels
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-900">Confirmation</h3>
                <p className="text-sm text-gray-600">
                  Receive instant confirmation and proceed with your purchase
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Measures */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Security Measures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    SSL/TLS Encryption
                  </h4>
                  <p className="text-sm text-gray-600">
                    All data is encrypted during transmission
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    PCI DSS Compliance
                  </h4>
                  <p className="text-sm text-gray-600">
                    Meets industry security standards
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Tokenization</h4>
                  <p className="text-sm text-gray-600">
                    Sensitive data is tokenized for security
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Regular Security Audits
                  </h4>
                  <p className="text-sm text-gray-600">
                    Continuous monitoring and testing
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Phase Notice */}
        <Card className="mb-8 border-0 shadow-lg bg-blue-50 border-l-4 border-blue-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-blue-800">
              <Zap className="h-5 w-5 text-blue-600" />
              Development Phase Features
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <div className="space-y-3">
              <p>
                <strong>Current Status:</strong> Our payment system is fully
                functional and secure. We're continuously enhancing features:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>✅ Core payment processing is live</li>
                <li>✅ Security measures are implemented</li>
                <li>🔄 Additional payment methods coming soon</li>
                <li>🔄 Enhanced fraud protection in development</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Payment Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              If you have questions about payments or encounter any issues, our
              support team is here to help:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">Contact Payment Support</p>
              <p>Email: payments@theplugmarket.in</p>
              <p>Phone: 1-800-PLUG-IN</p>
              <p className="text-sm text-gray-600 mt-2">
                We're available 24/7 to assist with any payment-related
                questions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
