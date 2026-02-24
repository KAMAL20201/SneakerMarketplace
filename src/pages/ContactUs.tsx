import { Mail, Phone,  MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-gray-600 text-lg">
            We're here to help! Get in touch with our support team.
          </p>
          <Badge variant="secondary" className="mt-3">
            Available 24/7
          </Badge>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">
                  For all queries and Support contact us at:
                </p>
                <p className="text-blue-600">support@theplugmarket.in</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="h-5 w-5 text-green-600" />
                Phone Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Customer Service</p>
                <p className="text-green-600 text-lg">+91-78885-27970</p>
                <p className="text-sm text-gray-600">
                  Monday - Friday: 10 AM - 6 PM IST
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Office Information */}
        {/* <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-purple-600" />
              Our Office
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="bg-purple-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900">The Plug Market HQ</p>
              <p className="text-gray-700">
                #222, Near Ram Mandir
                <br />
                Patiala Gate, Sangrur, Punjab 148001
                <br />
                India
              </p>
            </div> 
          </CardContent>
        </Card> */}

        {/* Response Times */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Email</h3>
                <p className="text-green-600 font-bold">Within 24 hours</p>
                <p className="text-sm text-gray-600">
                  Usually within 4-6 hours
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Phone</h3>
                <p className="text-blue-600 font-bold">Immediate</p>
                <p className="text-sm text-gray-600">During business hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
