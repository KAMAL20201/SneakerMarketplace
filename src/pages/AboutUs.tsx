import {
  Heart,
  Target,
  Users,
  Globe,
  TrendingUp,
  Shield,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full mb-6">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About The Plug Market
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            India's premier marketplace connecting collectors and sellers for
            authentic sneakers, streetwear, and collectibles. Where passion
            meets opportunity.
          </p>
          <Badge variant="secondary" className="mt-4 text-lg px-6 py-2">
            Est. 2025
          </Badge>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl text-blue-900">
                <Target className="h-6 w-6 text-blue-600" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p className="text-lg leading-relaxed">
                To create the most trusted and vibrant marketplace for sneaker
                and streetwear enthusiasts across India, ensuring authenticity,
                security, and exceptional user experience.
              </p>
              <p>
                We believe everyone deserves access to authentic, high-quality
                items while supporting a community of passionate collectors and
                sellers.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl text-green-900">
                <Globe className="h-6 w-6 text-green-600" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p className="text-lg leading-relaxed">
                To become India's leading destination for authentic streetwear
                culture, fostering a global community where collectors can
                discover, trade, and celebrate their passion.
              </p>
              <p>
                We envision a future where The Plug Market is synonymous with
                trust, authenticity, and community in the streetwear world.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Story Section */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-gray-900 mb-4">
              Our Story
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-gray-700">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-900">The Beginning</h3>
                <p className="text-sm">
                  Founded by passionate sneaker enthusiasts who saw the need for
                  a trusted marketplace in India's growing streetwear scene.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-900">Building Trust</h3>
                <p className="text-sm">
                  Developed robust verification systems and buyer protection to
                  ensure every transaction is secure and authentic.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-green-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  Growing Community
                </h3>
                <p className="text-sm">
                  Today, we serve thousands of collectors and sellers across
                  India, building the largest streetwear community in the
                  country.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-gray-900 mb-4">
              Our Core Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Authenticity</h3>
                <p className="text-sm text-gray-600">
                  Every item is verified to ensure it's genuine and as
                  described.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Community</h3>
                <p className="text-sm text-gray-600">
                  Building connections between passionate collectors and
                  sellers.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Innovation</h3>
                <p className="text-sm text-gray-600">
                  Continuously improving our platform and user experience.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Excellence</h3>
                <p className="text-sm text-gray-600">
                  Striving for the highest quality in everything we do.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Offer */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-gray-900 mb-4">
              What We Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  For Buyers
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Quality Verification
                      </h4>
                      <p className="text-sm text-gray-600">
                        Items are reviewed for quality and accurate description
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Secure Payments
                      </h4>
                      <p className="text-sm text-gray-600">
                        Multiple payment options with buyer protection
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Wide Selection
                      </h4>
                      <p className="text-sm text-gray-600">
                        Access to rare and exclusive items
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  For Sellers
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Easy Listing
                      </h4>
                      <p className="text-sm text-gray-600">
                        Simple tools to showcase your items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Reach More Buyers
                      </h4>
                      <p className="text-sm text-gray-600">
                        Access to our growing community
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Secure Transactions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Fast and secure payment processing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {/* <Card className="mb-12 border-0 shadow-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-white">Our Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">10K+</div>
                <div className="text-purple-200">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">50K+</div>
                <div className="text-purple-200">Items Listed</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">99.9%</div>
                <div className="text-purple-200">Authenticity Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-purple-200">Support</div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Team */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-gray-900 mb-4">
              Meet Our Team
            </CardTitle>
            <p className="text-gray-600">
              Passionate individuals dedicated to building the best marketplace
              experience
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto"></div>
                <h3 className="font-semibold text-gray-900">Leadership Team</h3>
                <p className="text-sm text-gray-600">
                  Experienced professionals with deep knowledge of e-commerce
                  and streetwear culture
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto"></div>
                <h3 className="font-semibold text-gray-900">Tech Team</h3>
                <p className="text-sm text-gray-600">
                  Skilled developers building innovative solutions for our
                  community
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mx-auto"></div>
                <h3 className="font-semibold text-gray-900">Support Team</h3>
                <p className="text-sm text-gray-600">
                  Dedicated customer service professionals ready to help 24/7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-900 to-blue-900 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              Join Our Community
            </CardTitle>
            <p className="text-gray-300">
              Ready to discover amazing items or start selling? Join thousands
              of users today!
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <p className="text-gray-300">
                Have questions or want to learn more about The Plug Market?
              </p>
              <div className="bg-white/10 p-4 rounded-lg">
                <p className="font-semibold">Get in Touch</p>
                <p>Email: hello@theplugmarket.in</p>
                <p>Phone: 1-800-PLUG-IN</p>
                <p>Address: [Your Business Address]</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
